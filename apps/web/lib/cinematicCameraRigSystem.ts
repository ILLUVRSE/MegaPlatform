import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  primitiveCount: z.number().int().nonnegative(),
  rigSwitchLatencyMs: z.number().nonnegative(),
  reusedInScenePipeline: z.boolean(),
  reusedInCutscenePipeline: z.boolean()
});

const policySchema = z.object({
  minReusablePrimitives: z.number().int().positive(),
  maxRigSwitchLatencyMs: z.number().nonnegative()
});

const fallback = { minReusablePrimitives: 3, maxRigSwitchLatencyMs: 120 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "cinematic-camera-rig-system.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateCinematicCameraRigSystem(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const primitiveCoverageMet = parsed.data.primitiveCount >= policy.minReusablePrimitives;
  const latencyMet = parsed.data.rigSwitchLatencyMs <= policy.maxRigSwitchLatencyMs;
  const crossPipelineReusable = parsed.data.reusedInScenePipeline && parsed.data.reusedInCutscenePipeline;

  return {
    ok: true as const,
    systemReady: primitiveCoverageMet && latencyMet && crossPipelineReusable,
    primitiveCoverageMet,
    latencyMet,
    crossPipelineReusable
  };
}
