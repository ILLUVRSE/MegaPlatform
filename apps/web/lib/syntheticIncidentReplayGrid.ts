import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  maxReplaysPerRun: z.number().int().positive(),
  requiredResponseFields: z.array(z.string().min(1)).min(1),
  passThreshold: z.number().min(0).max(1),
  severityWeights: z.record(z.string(), z.number().positive())
});

const replaySchema = z.object({
  id: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]),
  response: z.record(z.string(), z.string())
});

const defaultPolicy = {
  maxReplaysPerRun: 20,
  requiredResponseFields: ["containment", "rollback", "comms"],
  passThreshold: 0.75,
  severityWeights: {
    low: 0.5,
    medium: 1,
    high: 1.5,
    critical: 2
  }
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "synthetic-incident-replay-grid.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function runSyntheticIncidentReplay(rawReplays: unknown) {
  const parsed = z.array(replaySchema).safeParse(rawReplays);
  if (!parsed.success) return { ok: false as const, reason: "invalid_replays" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  const replays = parsed.data.slice(0, policy.maxReplaysPerRun);

  const results = replays.map((replay) => {
    const missingFields = policy.requiredResponseFields.filter((field) => !replay.response[field]);
    const baseScore = missingFields.length === 0 ? 1 : Math.max(0, 1 - missingFields.length / policy.requiredResponseFields.length);
    const weightedScore = baseScore * (policy.severityWeights[replay.severity] ?? 1);
    const normalizedScore = Math.min(1, weightedScore / 2);

    return {
      id: replay.id,
      severity: replay.severity,
      missingFields,
      score: normalizedScore,
      pass: normalizedScore >= policy.passThreshold
    };
  });

  return {
    ok: true as const,
    results,
    passCount: results.filter((result) => result.pass).length,
    failCount: results.filter((result) => !result.pass).length
  };
}
