import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  fidelityScore: z.number().min(0).max(1),
  gpuFrameCostMs: z.number().nonnegative(),
  cpuFrameCostMs: z.number().nonnegative()
});

const policySchema = z.object({
  minimumFidelityScore: z.number().min(0).max(1),
  maxGpuFrameCostMs: z.number().positive(),
  maxCpuFrameCostMs: z.number().positive()
});

const fallback = {
  minimumFidelityScore: 0.82,
  maxGpuFrameCostMs: 7.5,
  maxCpuFrameCostMs: 5.5
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "crowd-reaction-animation-systems.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateCrowdReactionAnimationSystems(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const fidelityMet = parsed.data.fidelityScore >= policy.minimumFidelityScore;
  const gpuBudgetMet = parsed.data.gpuFrameCostMs <= policy.maxGpuFrameCostMs;
  const cpuBudgetMet = parsed.data.cpuFrameCostMs <= policy.maxCpuFrameCostMs;

  return {
    ok: true as const,
    reactionSystemReady: fidelityMet && gpuBudgetMet && cpuBudgetMet,
    fidelityMet,
    gpuBudgetMet,
    cpuBudgetMet
  };
}
