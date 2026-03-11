import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  maxScenarioCount: z.number().int().min(1),
  riskCeiling: z.number().min(0).max(1),
  impactWeight: z.number().min(0),
  costWeight: z.number().min(0),
  riskWeight: z.number().min(0)
});

const requestSchema = z.object({
  alternatives: z
    .array(
      z.object({
        id: z.string().min(1),
        quarterlyImpact: z.number().min(0).max(1),
        executionCost: z.number().min(0).max(1),
        scenarioRisk: z.number().min(0).max(1),
        policyBounded: z.boolean()
      })
    )
    .min(1)
});

const fallback = {
  maxScenarioCount: 8,
  riskCeiling: 0.75,
  impactWeight: 0.5,
  costWeight: 0.2,
  riskWeight: 0.3
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "autonomous-strategy-simulator-v2.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function simulateAutonomousStrategyV2(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const policy = await loadPolicy();
  const scenarios = parsed.data.alternatives
    .filter((alt) => alt.policyBounded && alt.scenarioRisk <= policy.riskCeiling)
    .map((alt) => {
      const score =
        alt.quarterlyImpact * policy.impactWeight -
        alt.executionCost * policy.costWeight -
        alt.scenarioRisk * policy.riskWeight;
      return {
        ...alt,
        scenarioScore: Number(score.toFixed(4))
      };
    })
    .sort((a, b) => b.scenarioScore - a.scenarioScore || a.id.localeCompare(b.id))
    .slice(0, policy.maxScenarioCount);

  return { ok: true as const, scenarios, policyBoundedOnly: true, riskCeiling: policy.riskCeiling };
}
