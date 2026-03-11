import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  observedFrameTimeMs: z.number().nonnegative(),
  proposedResolutionScale: z.number().positive()
});

const policySchema = z.object({
  targetFrameTimeMs: z.number().positive(),
  frameTimeControlBandMs: z.number().positive(),
  minimumResolutionScale: z.number().positive(),
  maximumResolutionScale: z.number().positive()
});

const fallback = {
  targetFrameTimeMs: 11.1,
  frameTimeControlBandMs: 1.2,
  minimumResolutionScale: 0.6,
  maximumResolutionScale: 1.0
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "dynamic-resolution-governor.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateDynamicResolutionGovernor(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const frameTimeInBand =
    parsed.data.observedFrameTimeMs >= policy.targetFrameTimeMs - policy.frameTimeControlBandMs &&
    parsed.data.observedFrameTimeMs <= policy.targetFrameTimeMs + policy.frameTimeControlBandMs;
  const scaleWithinBounds =
    parsed.data.proposedResolutionScale >= policy.minimumResolutionScale &&
    parsed.data.proposedResolutionScale <= policy.maximumResolutionScale;

  return {
    ok: true as const,
    resolutionGoverned: frameTimeInBand && scaleWithinBounds,
    frameTimeInBand,
    scaleWithinBounds
  };
}
