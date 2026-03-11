import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
import { buildTrustworthyAiOperationsScore } from "@/lib/trustworthyAiScore";
import { buildGovernanceDriftReport } from "@/lib/governanceDrift";

const policySchema = z.object({
  healthThresholds: z.object({
    healthy: z.number().min(0).max(1),
    degraded: z.number().min(0).max(1)
  }),
  momentumWindowHours: z.number().int().positive()
});

const defaultPolicy = {
  healthThresholds: {
    healthy: 0.8,
    degraded: 0.55
  },
  momentumWindowHours: 24
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

async function loadPolicy() {
  const root = await findRepoRoot();
  try {
    const raw = await fs.readFile(path.join(root, "ops", "governance", "ecosystem-state-model.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function buildEcosystemStateModel() {
  const policy = await loadPolicy();
  const trustScore = await buildTrustworthyAiOperationsScore();
  const drift = await buildGovernanceDriftReport();

  const healthScore = Math.max(0, trustScore.score - drift.driftSignals.length * 0.05);
  const healthState =
    healthScore >= policy.healthThresholds.healthy
      ? "healthy"
      : healthScore >= policy.healthThresholds.degraded
        ? "degraded"
        : "critical";

  const momentumScore = drift.hasDrift ? 0.45 : 0.8;

  return {
    health: {
      score: Number(healthScore.toFixed(3)),
      state: healthState
    },
    momentum: {
      score: momentumScore,
      state: momentumScore >= 0.7 ? "positive" : "stalled",
      windowHours: policy.momentumWindowHours
    },
    contributingSignals: {
      trustworthyAiScore: trustScore.score,
      governanceDriftSignals: drift.driftSignals.length
    },
    generatedAt: new Date().toISOString()
  };
}
