import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const tierSchema = z.enum(["low", "medium", "high"]);
const requestSchema = z.object({
  deviceTier: tierSchema,
  activeSpatialVoices: z.number().int().nonnegative(),
  hrtfSourceCount: z.number().int().nonnegative(),
  directionalAudioEnabled: z.boolean(),
  distanceAttenuationEnabled: z.boolean()
});

const policySchema = z.object({
  maxVoicesPerTier: z.object({ low: z.number().int().nonnegative(), medium: z.number().int().nonnegative(), high: z.number().int().nonnegative() }),
  maxHrtfSourcesPerTier: z.object({ low: z.number().int().nonnegative(), medium: z.number().int().nonnegative(), high: z.number().int().nonnegative() }),
  requireDistanceAttenuation: z.boolean()
});

const fallback = {
  maxVoicesPerTier: { low: 16, medium: 32, high: 64 },
  maxHrtfSourcesPerTier: { low: 8, medium: 16, high: 24 },
  requireDistanceAttenuation: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "spatial-audio-runtime-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateSpatialAudioRuntimeV1(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const voiceBudgetMet = parsed.data.activeSpatialVoices <= policy.maxVoicesPerTier[parsed.data.deviceTier];
  const hrtfBudgetMet = parsed.data.hrtfSourceCount <= policy.maxHrtfSourcesPerTier[parsed.data.deviceTier];
  const attenuationCompliant = !policy.requireDistanceAttenuation || parsed.data.distanceAttenuationEnabled;

  return {
    ok: true as const,
    runtimeReady: voiceBudgetMet && hrtfBudgetMet && attenuationCompliant && parsed.data.directionalAudioEnabled,
    directionalAudioEnabled: parsed.data.directionalAudioEnabled,
    attenuationCompliant,
    voiceBudgetMet,
    hrtfBudgetMet
  };
}
