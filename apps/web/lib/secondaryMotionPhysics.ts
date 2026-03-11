import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  cpuCostMs: z.number().min(0),
  simulatedNodes: z.number().int().nonnegative(),
  frameBudgetPercent: z.number().min(0)
});

const policySchema = z.object({
  maxCpuCostMs: z.number().positive(),
  maxSimulatedNodes: z.number().int().positive(),
  maxFrameBudgetPercent: z.number().positive()
});

const fallback = { maxCpuCostMs: 2.5, maxSimulatedNodes: 120, maxFrameBudgetPercent: 15 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "secondary-motion-physics.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateSecondaryMotionPhysics(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const withinBudget =
    parsed.data.cpuCostMs <= policy.maxCpuCostMs &&
    parsed.data.simulatedNodes <= policy.maxSimulatedNodes &&
    parsed.data.frameBudgetPercent <= policy.maxFrameBudgetPercent;

  return {
    ok: true as const,
    withinPerformanceBudget: withinBudget,
    measured: parsed.data,
    policy
  };
}
