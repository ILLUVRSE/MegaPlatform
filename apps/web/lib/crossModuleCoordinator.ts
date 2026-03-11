import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  globalWeight: z.number().min(0),
  localWeight: z.number().min(0),
  safetyPenaltyWeight: z.number().min(0)
});

const proposalSchema = z.object({
  module: z.string().min(1),
  objectiveId: z.string().min(1),
  expectedImpact: z.number(),
  ecosystemImpact: z.number(),
  safetyRisk: z.number().min(0).max(1)
});

const defaultPolicy = {
  globalWeight: 0.5,
  localWeight: 0.35,
  safetyPenaltyWeight: 0.15
};

export async function loadCoordinatorPolicy() {
  const fullPath = path.join(process.cwd(), "ops", "governance", "cross-module-coordinator.json");
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

export async function buildCoordinationPlan(proposals: unknown) {
  const policy = await loadCoordinatorPolicy();
  const parsed = z.array(proposalSchema).safeParse(proposals);
  if (!parsed.success) {
    return { policy, plan: [] as Array<Record<string, unknown>> };
  }

  const plan = parsed.data
    .map((proposal) => {
      const score =
        proposal.ecosystemImpact * policy.globalWeight +
        proposal.expectedImpact * policy.localWeight -
        proposal.safetyRisk * policy.safetyPenaltyWeight;

      return {
        ...proposal,
        score
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    policy,
    plan,
    generatedAt: new Date().toISOString()
  };
}
