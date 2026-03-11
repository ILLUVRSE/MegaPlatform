import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  minWinsToPromote: z.number().int().positive(),
  minConfidenceToPromote: z.number().min(0).max(1),
  outputPath: z.string().min(1)
});

const outcomeSchema = z.object({
  experimentId: z.string().min(1),
  module: z.string().min(1),
  pattern: z.string().min(1),
  win: z.boolean(),
  confidence: z.number().min(0).max(1)
});

const defaultPolicy = {
  minWinsToPromote: 2,
  minConfidenceToPromote: 0.65,
  outputPath: "docs/ops_brain/learning-patterns.json"
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

async function readJsonArray<T>(filePath: string, schema: z.ZodType<T>) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = z.array(schema).safeParse(parsed);
    if (!result.success) return [];
    return result.data;
  } catch {
    return [];
  }
}

export async function loadLearningPolicy() {
  const root = await findRepoRoot();
  const fullPath = path.join(root, "ops", "governance", "learning-consolidation.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = policySchema.safeParse(parsed);
    if (!result.success) return defaultPolicy;
    return result.data;
  } catch {
    return defaultPolicy;
  }
}

export async function consolidateLearningMemory() {
  const root = await findRepoRoot();
  const policy = await loadLearningPolicy();
  const outcomesPath = path.join(root, "ops", "logs", "micro-experiment-outcomes.json");
  const outcomes = await readJsonArray(outcomesPath, outcomeSchema);

  const grouped = new Map<string, { module: string; wins: number; total: number; confidenceSum: number }>();
  for (const row of outcomes) {
    const key = `${row.module}::${row.pattern}`;
    const current = grouped.get(key) ?? { module: row.module, wins: 0, total: 0, confidenceSum: 0 };
    current.total += 1;
    current.confidenceSum += row.confidence;
    if (row.win) current.wins += 1;
    grouped.set(key, current);
  }

  const promoted = [...grouped.entries()]
    .map(([key, value]) => {
      const pattern = key.split("::")[1] ?? key;
      const avgConfidence = value.total > 0 ? value.confidenceSum / value.total : 0;
      return {
        module: value.module,
        pattern,
        wins: value.wins,
        total: value.total,
        avgConfidence,
        promote: value.wins >= policy.minWinsToPromote && avgConfidence >= policy.minConfidenceToPromote
      };
    })
    .filter((item) => item.promote);

  const payload = {
    generatedAt: new Date().toISOString(),
    policy,
    promoted
  };

  const outputPath = path.join(root, policy.outputPath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");

  return payload;
}
