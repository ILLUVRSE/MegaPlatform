import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const tierSchema = z.enum(["low", "medium", "high"]);
const requestSchema = z.object({
  deviceTier: tierSchema,
  dynamicLightCount: z.number().int().nonnegative(),
  supportsDynamicLighting: z.boolean(),
  bakedLightingAvailable: z.boolean()
});

const policySchema = z.object({
  maxDynamicLightsByTier: z.object({ low: z.number().int().nonnegative(), medium: z.number().int().nonnegative(), high: z.number().int().nonnegative() }),
  allowBakedLightingFallback: z.boolean(),
  requiredCapabilityKey: z.literal("supportsDynamicLighting")
});

const fallback = {
  maxDynamicLightsByTier: { low: 2, medium: 6, high: 12 },
  allowBakedLightingFallback: true,
  requiredCapabilityKey: "supportsDynamicLighting" as const
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "xr-lighting-pipeline.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateXrLightingPipeline(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const tierBudget = policy.maxDynamicLightsByTier[parsed.data.deviceTier];
  const dynamicTierValid = parsed.data.dynamicLightCount <= tierBudget;
  const dynamicSupported = parsed.data.supportsDynamicLighting;
  const fallbackActive = !dynamicSupported && policy.allowBakedLightingFallback && parsed.data.bakedLightingAvailable;

  return {
    ok: true as const,
    qualityTierCompliant: (dynamicSupported && dynamicTierValid) || fallbackActive,
    dynamicTierValid,
    dynamicSupported,
    fallbackActive
  };
}
