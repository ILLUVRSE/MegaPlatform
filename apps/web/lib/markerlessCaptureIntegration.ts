import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({ confidence: z.number().min(0).max(1), noise: z.number().min(0), normalizationProfile: z.string().min(1) });
const policySchema = z.object({ minConfidence: z.number().min(0).max(1), maxNoise: z.number().min(0), normalizationProfile: z.string().min(1) });

const fallback = { minConfidence: 0.85, maxNoise: 0.12, normalizationProfile: "body_v1" };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "markerless-capture-integration.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateMarkerlessCaptureIntegration(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const normalized = parsed.data.normalizationProfile === policy.normalizationProfile;
  const passesQuality = parsed.data.confidence >= policy.minConfidence && parsed.data.noise <= policy.maxNoise;

  return {
    ok: true as const,
    normalized,
    passesQuality,
    integrated: normalized && passesQuality
  };
}
