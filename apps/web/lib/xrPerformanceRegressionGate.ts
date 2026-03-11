import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  gpuFrameTimeMs: z.number().nonnegative(),
  cpuFrameTimeMs: z.number().nonnegative(),
  stableFps: z.number().nonnegative(),
  ciGateEnabled: z.boolean(),
  releaseBlockedOnFailure: z.boolean()
});

const policySchema = z.object({
  maximumGpuFrameTimeMs: z.number().positive(),
  maximumCpuFrameTimeMs: z.number().positive(),
  minimumStableFps: z.number().positive(),
  requireCiEnforcement: z.boolean(),
  requireReleaseBlockingOnFailure: z.boolean()
});

const fallback = {
  maximumGpuFrameTimeMs: 8.5,
  maximumCpuFrameTimeMs: 5.5,
  minimumStableFps: 90,
  requireCiEnforcement: true,
  requireReleaseBlockingOnFailure: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "xr-performance-regression-gate.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateXrPerformanceRegressionGate(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const gpuBaselineMet = parsed.data.gpuFrameTimeMs <= policy.maximumGpuFrameTimeMs;
  const cpuBaselineMet = parsed.data.cpuFrameTimeMs <= policy.maximumCpuFrameTimeMs;
  const fpsBaselineMet = parsed.data.stableFps >= policy.minimumStableFps;
  const ciEnforcementMet = !policy.requireCiEnforcement || parsed.data.ciGateEnabled;
  const releaseBlockingMet = !policy.requireReleaseBlockingOnFailure || parsed.data.releaseBlockedOnFailure;

  return {
    ok: true as const,
    regressionGatePassing: gpuBaselineMet && cpuBaselineMet && fpsBaselineMet && ciEnforcementMet && releaseBlockingMet,
    gpuBaselineMet,
    cpuBaselineMet,
    fpsBaselineMet,
    ciEnforcementMet,
    releaseBlockingMet
  };
}
