import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  gpuFrameTimeMs: z.number().nonnegative(),
  appliedMitigations: z.array(z.string().min(1)),
  mitigationOrderDeterministic: z.boolean()
});

const policySchema = z.object({
  maxGpuFrameTimeMs: z.number().positive(),
  requiredMitigations: z.array(z.string().min(1)).min(1),
  requireDeterministicMitigationOrder: z.boolean()
});

const fallback = {
  maxGpuFrameTimeMs: 8.5,
  requiredMitigations: ["shadow_quality_drop", "particle_density_cap"],
  requireDeterministicMitigationOrder: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "gpu-budget-controller.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateGpuBudgetController(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const withinBudget = parsed.data.gpuFrameTimeMs <= policy.maxGpuFrameTimeMs;
  const missingMitigations = policy.requiredMitigations.filter((mitigation) => !parsed.data.appliedMitigations.includes(mitigation));
  const deterministicMitigationOrderMet = !policy.requireDeterministicMitigationOrder || parsed.data.mitigationOrderDeterministic;

  return {
    ok: true as const,
    gpuBudgetControlled: withinBudget || (missingMitigations.length === 0 && deterministicMitigationOrderMet),
    withinBudget,
    missingMitigations,
    deterministicMitigationOrderMet
  };
}
