import path from "path";
import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import { z } from "zod";

const policySchema = z.object({
  maxEntries: z.number().int().positive(),
  requiredEvidenceKinds: z.array(z.enum(["metric", "decision", "experiment"])).min(1),
  strategyWindowDays: z.number().int().positive()
});

const memoryEntrySchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().min(1),
  theme: z.string().min(1),
  summary: z.string().min(1),
  evidence: z.array(
    z.object({
      kind: z.enum(["metric", "decision", "experiment"]),
      ref: z.string().min(1)
    })
  )
});

const appendSchema = z.object({
  theme: z.string().min(1),
  summary: z.string().min(1),
  evidence: z.array(
    z.object({
      kind: z.enum(["metric", "decision", "experiment"]),
      ref: z.string().min(1)
    })
  )
});

type StrategyMemoryPolicy = z.infer<typeof policySchema>;
type StrategyEvidenceKind = z.infer<typeof memoryEntrySchema>["evidence"][number]["kind"];

const defaultPolicy: StrategyMemoryPolicy = {
  maxEntries: 500,
  requiredEvidenceKinds: ["metric", "decision", "experiment"],
  strategyWindowDays: 90
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
    if (await exists(path.join(current, "pnpm-workspace.yaml"))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

async function loadPolicy(root: string) {
  try {
    const raw = await fs.readFile(path.join(root, "ops", "governance", "long-horizon-memory.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

async function readEntries(root: string) {
  try {
    const raw = await fs.readFile(path.join(root, "docs", "ops_brain", "strategy-memory.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = z.array(memoryEntrySchema).safeParse(parsed);
    if (!validated.success) return [];
    return validated.data;
  } catch {
    return [];
  }
}

export async function appendStrategyMemory(rawInput: unknown) {
  const parsed = appendSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: "invalid_input" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const evidenceKinds = new Set(parsed.data.evidence.map((item) => item.kind));
  const missingKinds = policy.requiredEvidenceKinds.filter((kind) => !evidenceKinds.has(kind));
  if (missingKinds.length > 0) {
    return { ok: false as const, reason: "missing_evidence_kinds", missingKinds };
  }

  const existing = await readEntries(root);
  const next = [
    ...existing,
    {
      id: `strategy-memory-${randomUUID()}`,
      createdAt: new Date().toISOString(),
      ...parsed.data
    }
  ].slice(-policy.maxEntries);

  await fs.writeFile(path.join(root, "docs", "ops_brain", "strategy-memory.json"), `${JSON.stringify(next, null, 2)}\n`, "utf-8");

  return {
    ok: true as const,
    totalEntries: next.length,
    strategyWindowDays: policy.strategyWindowDays
  };
}

export async function listStrategyMemory() {
  const root = await findRepoRoot();
  const entries = await readEntries(root);
  return {
    ok: true as const,
    entries: [...entries].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  };
}
