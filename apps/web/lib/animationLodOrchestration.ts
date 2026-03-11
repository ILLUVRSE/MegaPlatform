import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  qualityRetentionScore: z.number().min(0).max(1),
  animationRuntimeCostMs: z.number().nonnegative(),
  distanceTieringEnabled: z.boolean()
});

const policySchema = z.object({
  minimumQualityRetentionScore: z.number().min(0).max(1),
  maxAnimationRuntimeCostMs: z.number().positive(),
  requireDistanceTiering: z.boolean()
});

const fallback = {
  minimumQualityRetentionScore: 0.8,
  maxAnimationRuntimeCostMs: 4.5,
  requireDistanceTiering: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "animation-lod-orchestration.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateAnimationLodOrchestration(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const qualityPreserved = parsed.data.qualityRetentionScore >= policy.minimumQualityRetentionScore;
  const runtimeCostReduced = parsed.data.animationRuntimeCostMs <= policy.maxAnimationRuntimeCostMs;
  const tieringMet = !policy.requireDistanceTiering || parsed.data.distanceTieringEnabled;

  return {
    ok: true as const,
    lodOrchestrated: qualityPreserved && runtimeCostReduced && tieringMet,
    qualityPreserved,
    runtimeCostReduced,
    tieringMet
  };
}
