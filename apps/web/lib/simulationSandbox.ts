import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const simulationPolicySchema = z.object({
  requiredBeforeRollout: z.boolean(),
  maxRiskScore: z.number().min(0).max(1),
  minConfidence: z.number().min(0).max(1)
});

const defaultPolicy = {
  requiredBeforeRollout: true,
  maxRiskScore: 0.5,
  minConfidence: 0.6
};

type SimulationInput = {
  changeType: string;
  expectedLift: number;
  expectedRisk: number;
  confidence: number;
};

export async function loadSimulationPolicy() {
  const fullPath = path.join(process.cwd(), "ops", "governance", "simulation-policy.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = simulationPolicySchema.safeParse(parsed);
    if (!result.success) return defaultPolicy;
    return result.data;
  } catch {
    return defaultPolicy;
  }
}

export async function runSimulation(input: SimulationInput) {
  const policy = await loadSimulationPolicy();
  return {
    id: `sim-${input.changeType.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    changeType: input.changeType,
    expectedLift: input.expectedLift,
    expectedRisk: input.expectedRisk,
    confidence: input.confidence,
    pass: input.expectedRisk <= policy.maxRiskScore && input.confidence >= policy.minConfidence,
    generatedAt: new Date().toISOString()
  };
}

export async function validateRolloutPreflight(simulation: { pass: boolean } | null) {
  const policy = await loadSimulationPolicy();
  if (!policy.requiredBeforeRollout) return { pass: true, reason: "simulation not required by policy" };
  if (!simulation) return { pass: false, reason: "simulation report required before rollout" };
  if (!simulation.pass) return { pass: false, reason: "simulation report failed policy thresholds" };
  return { pass: true, reason: "simulation report satisfies rollout policy" };
}
