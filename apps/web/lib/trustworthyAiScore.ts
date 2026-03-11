import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
import { buildGovernanceDriftReport } from "@/lib/governanceDrift";
import { buildAutonomousLoopReliabilityReview } from "@/lib/autonomousLoopReview";

const policySchema = z.object({
  weights: z.object({
    reliability: z.number().min(0),
    governance: z.number().min(0)
  }),
  thresholds: z.object({
    restricted: z.number().min(0).max(1),
    halted: z.number().min(0).max(1)
  })
});

const defaultPolicy = {
  weights: {
    reliability: 0.5,
    governance: 0.5
  },
  thresholds: {
    restricted: 0.7,
    halted: 0.45
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

async function loadPolicy() {
  const root = await findRepoRoot();
  try {
    const raw = await fs.readFile(path.join(root, "ops", "governance", "trustworthy-ai-score.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function buildTrustworthyAiOperationsScore() {
  const policy = await loadPolicy();
  const drift = await buildGovernanceDriftReport();
  const loopReview = await buildAutonomousLoopReliabilityReview();

  const reliabilityScore = loopReview.pass ? 1 : 0.5;
  const governanceScore = drift.hasDrift ? Math.max(0, 1 - drift.driftSignals.length * 0.2) : 1;

  const totalWeight = policy.weights.reliability + policy.weights.governance;
  const normalizedScore =
    (reliabilityScore * policy.weights.reliability + governanceScore * policy.weights.governance) /
    (totalWeight === 0 ? 1 : totalWeight);

  const actionLimit =
    normalizedScore < policy.thresholds.halted ? "halted" : normalizedScore < policy.thresholds.restricted ? "restricted" : "normal";

  return {
    score: Number(normalizedScore.toFixed(3)),
    actionLimit,
    components: {
      reliabilityScore,
      governanceScore
    },
    policy,
    generatedAt: new Date().toISOString()
  };
}
