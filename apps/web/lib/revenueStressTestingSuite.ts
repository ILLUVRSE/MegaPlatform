import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  minResilienceRatio: z.number().min(0).max(1),
  breachThresholdRatio: z.number().min(0).max(1),
  requiredScenarios: z.array(z.string().min(1))
});

const requestSchema = z.object({
  baselineRevenueCents: z.number().int().nonnegative(),
  scenarios: z.array(z.object({ name: z.string().min(1), projectedRevenueCents: z.number().int().nonnegative() }))
});

const defaultPolicy = { minResilienceRatio: 0.7, breachThresholdRatio: 0.5, requiredScenarios: ["demand_drop", "refund_spike", "ad_market_decline"] };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "revenue-stress-testing-suite.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : defaultPolicy;
  } catch {
    return defaultPolicy;
  }
}

export async function runRevenueStressTest(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const scenarioMap = new Set(parsed.data.scenarios.map((s) => s.name));
  const missingScenarios = policy.requiredScenarios.filter((name) => !scenarioMap.has(name));

  const baseline = Math.max(parsed.data.baselineRevenueCents, 1);
  const evaluated = parsed.data.scenarios.map((scenario) => {
    const resilienceRatio = scenario.projectedRevenueCents / baseline;
    return {
      ...scenario,
      resilienceRatio,
      breached: resilienceRatio < policy.breachThresholdRatio,
      atRisk: resilienceRatio < policy.minResilienceRatio
    };
  });

  return {
    ok: true as const,
    scenarios: evaluated,
    missingScenarios,
    breachPoints: evaluated.filter((entry) => entry.breached).map((entry) => entry.name),
    policy
  };
}
