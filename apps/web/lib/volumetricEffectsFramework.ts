import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  preset: z.string().min(1),
  estimatedGpuCostMs: z.number().nonnegative(),
  particleDensity: z.number().min(0).max(1)
});

const policySchema = z.object({
  allowedPresets: z.array(z.string().min(1)).min(1),
  maxGpuCostMs: z.number().nonnegative(),
  maxParticleDensity: z.number().min(0).max(1)
});

const fallback = { allowedPresets: ["mist", "godrays", "storm"], maxGpuCostMs: 3.5, maxParticleDensity: 0.8 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "volumetric-effects-framework.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateVolumetricEffectsFramework(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const presetAllowed = policy.allowedPresets.includes(parsed.data.preset);
  const gpuCapMet = parsed.data.estimatedGpuCostMs <= policy.maxGpuCostMs;
  const densityCapMet = parsed.data.particleDensity <= policy.maxParticleDensity;

  return {
    ok: true as const,
    frameworkCompliant: presetAllowed && gpuCapMet && densityCapMet,
    presetAllowed,
    gpuCapMet,
    densityCapMet
  };
}
