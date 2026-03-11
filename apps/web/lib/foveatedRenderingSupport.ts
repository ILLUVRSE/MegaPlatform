import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  deviceCapabilities: z.array(z.string().min(1)),
  peripheralQualityScore: z.number().min(0).max(1),
  fallbackPathAvailable: z.boolean()
});

const policySchema = z.object({
  requiredDeviceCapabilities: z.array(z.string().min(1)).min(1),
  minimumPeripheralQualityScore: z.number().min(0).max(1),
  allowFallbackWhenUnsupported: z.boolean()
});

const fallback = {
  requiredDeviceCapabilities: ["eye_tracking"],
  minimumPeripheralQualityScore: 0.78,
  allowFallbackWhenUnsupported: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "foveated-rendering-support.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateFoveatedRenderingSupport(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const capabilityGated = policy.requiredDeviceCapabilities.every((capability) => parsed.data.deviceCapabilities.includes(capability));
  const qualityValidated = parsed.data.peripheralQualityScore >= policy.minimumPeripheralQualityScore;
  const fallbackAvailable = policy.allowFallbackWhenUnsupported ? parsed.data.fallbackPathAvailable || capabilityGated : capabilityGated;

  return {
    ok: true as const,
    foveatedReady: capabilityGated && qualityValidated,
    capabilityGated,
    qualityValidated,
    fallbackAvailable
  };
}
