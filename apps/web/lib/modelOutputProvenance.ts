import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  outputPath: z.string().min(1),
  requiredInputKinds: z.array(z.string().min(1)).min(1),
  requiredDecisionFields: z.array(z.string().min(1)).min(1),
  maxEntries: z.number().int().positive()
});

const entrySchema = z.object({
  outputId: z.string().min(1),
  outputKind: z.string().min(1),
  inputs: z
    .array(
      z.object({
        kind: z.string().min(1),
        ref: z.string().min(1)
      })
    )
    .min(1),
  decision: z.object({
    decisionId: z.string().min(1),
    decisionSource: z.string().min(1)
  }),
  generatedAt: z.string().datetime().optional()
});

const defaultPolicy = {
  outputPath: "ops/logs/model-output-provenance.json",
  requiredInputKinds: ["prompt", "policy", "context"],
  requiredDecisionFields: ["decisionId", "decisionSource"],
  maxEntries: 500
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "model-output-provenance-ledger.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

async function readLedger(root: string, outputPath: string) {
  try {
    const raw = await fs.readFile(path.join(root, outputPath), "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.entries)) return { entries: [] as unknown[] };
    return parsed;
  } catch {
    return { entries: [] as unknown[] };
  }
}

export async function appendModelOutputProvenance(rawEntry: unknown) {
  const parsed = entrySchema.safeParse(rawEntry);
  if (!parsed.success) return { ok: false as const, reason: "invalid_entry" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const inputKinds = new Set(parsed.data.inputs.map((input) => input.kind));
  const missingKinds = policy.requiredInputKinds.filter((kind) => !inputKinds.has(kind));
  if (missingKinds.length > 0) {
    return { ok: false as const, reason: "missing_required_input_kinds", missingKinds };
  }

  const ledger = await readLedger(root, policy.outputPath);
  const nextEntries = [
    parsed.data,
    ...ledger.entries.filter((entry) => (entry as { outputId?: string }).outputId !== parsed.data.outputId)
  ].slice(0, policy.maxEntries);

  const normalized = {
    entries: nextEntries.map((entry) => {
      const value = entry as z.infer<typeof entrySchema>;
      return {
        ...value,
        generatedAt: value.generatedAt ?? "1970-01-01T00:00:00.000Z"
      };
    })
  };

  await fs.writeFile(path.join(root, policy.outputPath), `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");

  return { ok: true as const, entry: normalized.entries[0], entryCount: normalized.entries.length };
}

export async function readModelOutputProvenanceLedger() {
  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  return readLedger(root, policy.outputPath);
}
