import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
import { buildTrustworthyAiOperationsScore } from "@/lib/trustworthyAiScore";
import { buildEcosystemStateModel } from "@/lib/ecosystemStateModel";
import { listStrategyMemory } from "@/lib/strategyMemory";

const policySchema = z.object({
  minimumScore: z.number().min(0).max(1),
  dimensionWeights: z.object({
    reliability: z.number().min(0),
    safety: z.number().min(0),
    growth: z.number().min(0)
  })
});

const defaultPolicy = {
  minimumScore: 0.75,
  dimensionWeights: {
    reliability: 0.4,
    safety: 0.35,
    growth: 0.25
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "autonomous-maturity-certification.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function buildAutonomousMaturityCertification() {
  const policy = await loadPolicy();
  const trustworthy = await buildTrustworthyAiOperationsScore();
  const ecosystem = await buildEcosystemStateModel();
  const memory = await listStrategyMemory();

  const reliability = trustworthy.score;
  const safety = ecosystem.health.state === "critical" ? 0.4 : ecosystem.health.state === "degraded" ? 0.7 : 0.9;
  const growth = Math.min(1, memory.entries.length / 10);

  const totalWeight = policy.dimensionWeights.reliability + policy.dimensionWeights.safety + policy.dimensionWeights.growth;
  const score =
    (reliability * policy.dimensionWeights.reliability +
      safety * policy.dimensionWeights.safety +
      growth * policy.dimensionWeights.growth) /
    (totalWeight === 0 ? 1 : totalWeight);

  return {
    score: Number(score.toFixed(3)),
    minimumScore: policy.minimumScore,
    certified: score >= policy.minimumScore,
    dimensions: {
      reliability,
      safety,
      growth
    },
    generatedAt: new Date().toISOString()
  };
}
