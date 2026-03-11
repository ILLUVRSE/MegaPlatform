import path from "path";
import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import { z } from "zod";

const evidenceSchema = z.object({
  kind: z.enum(["metric", "log", "policy", "runbook"]),
  ref: z.string().min(1),
  note: z.string().min(1).optional()
});

const decisionEntrySchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().min(1),
  agentRole: z.string().min(1),
  decisionType: z.string().min(1),
  rationale: z.string().min(1),
  evidence: z.array(evidenceSchema).min(1),
  confidence: z.number().min(0).max(1),
  riskLevel: z.enum(["low", "medium", "high"]),
  relatedTaskId: z.string().min(1).optional(),
  outcomes: z.array(z.string().min(1)).default([])
});

const policySchema = z.object({
  requiredEvidenceKinds: z.array(z.enum(["metric", "log", "policy", "runbook"])).min(1),
  requiredFields: z.array(z.string().min(1)).min(1),
  minConfidence: z.number().min(0).max(1),
  maxEntryAgeDays: z.number().int().positive()
});

const appendInputSchema = z.object({
  agentRole: z.string().min(1),
  decisionType: z.string().min(1),
  rationale: z.string().min(1),
  evidence: z.array(evidenceSchema).min(1),
  confidence: z.number().min(0).max(1),
  riskLevel: z.enum(["low", "medium", "high"]),
  relatedTaskId: z.string().min(1).optional(),
  outcomes: z.array(z.string().min(1)).default([])
});

const querySchema = z.object({
  agentRole: z.string().min(1).optional(),
  decisionType: z.string().min(1).optional(),
  since: z.string().datetime().optional(),
  maxItems: z.number().int().positive().max(200).optional()
});

type DecisionEntry = z.infer<typeof decisionEntrySchema>;

type LoadOptions = { rootOverride?: string };

type DecisionJournalPolicy = z.infer<typeof policySchema>;
type EvidenceKind = z.infer<typeof evidenceSchema>["kind"];

const defaultPolicy: DecisionJournalPolicy = {
  requiredEvidenceKinds: ["metric", "log", "policy", "runbook"],
  requiredFields: ["agentRole", "decisionType", "rationale", "evidence", "confidence", "riskLevel"],
  minConfidence: 0.5,
  maxEntryAgeDays: 90
};

async function exists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function findRepoRoot() {
  let current = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (await exists(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

async function getRoot(options?: LoadOptions) {
  return options?.rootOverride ?? (await findRepoRoot());
}

async function getJournalPath(options?: LoadOptions) {
  const root = await getRoot(options);
  return path.join(root, "docs", "ops_brain", "decision-journal.json");
}

export async function loadDecisionJournalPolicy(options?: LoadOptions) {
  const root = await getRoot(options);
  const fullPath = path.join(root, "ops", "governance", "decision-journal.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function loadDecisionJournalEntries(options?: LoadOptions) {
  const fullPath = await getJournalPath(options);
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const validated = z.array(decisionEntrySchema).safeParse(parsed);
    if (!validated.success) return [];
    return validated.data;
  } catch {
    return [];
  }
}

export async function appendDecisionJournalEntry(rawInput: unknown, options?: LoadOptions) {
  const parsed = appendInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false as const, reason: "invalid_input" };
  }

  const policy = await loadDecisionJournalPolicy(options);
  const evidenceKinds = new Set(parsed.data.evidence.map((item) => item.kind));
  const missingEvidenceKinds = policy.requiredEvidenceKinds.filter((kind) => !evidenceKinds.has(kind));

  if (parsed.data.confidence < policy.minConfidence) {
    return { ok: false as const, reason: "confidence_below_minimum", minConfidence: policy.minConfidence };
  }

  if (missingEvidenceKinds.length > 0) {
    return { ok: false as const, reason: "missing_evidence_kinds", missingEvidenceKinds };
  }

  const entries = await loadDecisionJournalEntries(options);
  const entry: DecisionEntry = {
    id: `decision-${randomUUID()}`,
    createdAt: new Date().toISOString(),
    ...parsed.data
  };

  const next = [...entries, entry];
  const fullPath = await getJournalPath(options);
  await fs.writeFile(fullPath, `${JSON.stringify(next, null, 2)}\n`, "utf-8");

  return {
    ok: true as const,
    entry,
    totalEntries: next.length
  };
}

export async function queryDecisionJournal(rawQuery: unknown, options?: LoadOptions) {
  const parsed = querySchema.safeParse(rawQuery ?? {});
  if (!parsed.success) {
    return { ok: false as const, reason: "invalid_query", entries: [] as DecisionEntry[] };
  }

  const entries = await loadDecisionJournalEntries(options);
  const sinceMs = parsed.data.since ? Date.parse(parsed.data.since) : null;

  const filtered = entries
    .filter((entry) => {
      if (parsed.data.agentRole && entry.agentRole !== parsed.data.agentRole) return false;
      if (parsed.data.decisionType && entry.decisionType !== parsed.data.decisionType) return false;
      if (sinceMs && Date.parse(entry.createdAt) < sinceMs) return false;
      return true;
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const maxItems = parsed.data.maxItems ?? 50;
  return {
    ok: true as const,
    count: filtered.length,
    entries: filtered.slice(0, maxItems)
  };
}
