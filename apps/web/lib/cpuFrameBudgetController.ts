import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  cpuFrameTimeMs: z.number().nonnegative(),
  appliedFallbacks: z.array(z.string().min(1)),
  boundedFallbackBehavior: z.boolean()
});

const policySchema = z.object({
  maxCpuFrameTimeMs: z.number().positive(),
  requiredFallbacks: z.array(z.string().min(1)).min(1),
  requireBoundedFallbackBehavior: z.boolean()
});

const fallback = {
  maxCpuFrameTimeMs: 5.5,
  requiredFallbacks: ["animation_update_throttle", "script_tick_budget"],
  requireBoundedFallbackBehavior: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "cpu-frame-budget-controller.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateCpuFrameBudgetController(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const withinBudget = parsed.data.cpuFrameTimeMs <= policy.maxCpuFrameTimeMs;
  const missingFallbacks = policy.requiredFallbacks.filter((fallbackRule) => !parsed.data.appliedFallbacks.includes(fallbackRule));
  const boundedBehaviorMet = !policy.requireBoundedFallbackBehavior || parsed.data.boundedFallbackBehavior;

  return {
    ok: true as const,
    cpuBudgetControlled: withinBudget || (missingFallbacks.length === 0 && boundedBehaviorMet),
    withinBudget,
    missingFallbacks,
    boundedBehaviorMet
  };
}
