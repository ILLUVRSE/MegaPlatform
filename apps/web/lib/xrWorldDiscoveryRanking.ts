import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  relevanceScore: z.number().min(0).max(1),
  qualityScore: z.number().min(0).max(1),
  safetyScore: z.number().min(0).max(1),
  freshnessScore: z.number().min(0).max(1),
  promotionBoost: z.number().min(0).max(1)
});

const policySchema = z.object({
  relevanceWeight: z.number().nonnegative(),
  qualityWeight: z.number().nonnegative(),
  safetyWeight: z.number().nonnegative(),
  freshnessWeight: z.number().nonnegative(),
  minimumSafetyScore: z.number().min(0).max(1),
  maximumPromotionBoost: z.number().min(0).max(1)
});

const fallback = {
  relevanceWeight: 0.4,
  qualityWeight: 0.25,
  safetyWeight: 0.25,
  freshnessWeight: 0.1,
  minimumSafetyScore: 0.7,
  maximumPromotionBoost: 0.15
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "xr-world-discovery-ranking.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateXrWorldDiscoveryRanking(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const promotionBoostApplied = Math.min(parsed.data.promotionBoost, policy.maximumPromotionBoost);
  const rankingScore =
    parsed.data.relevanceScore * policy.relevanceWeight +
    parsed.data.qualityScore * policy.qualityWeight +
    parsed.data.safetyScore * policy.safetyWeight +
    parsed.data.freshnessScore * policy.freshnessWeight +
    promotionBoostApplied;

  const safetyBoundCompliant = parsed.data.safetyScore >= policy.minimumSafetyScore;

  return {
    ok: true as const,
    rankingEligible: safetyBoundCompliant,
    rankingScore: Math.min(1, rankingScore),
    safetyBoundCompliant,
    promotionBoostApplied
  };
}
