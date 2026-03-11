import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  thermalState: z.number().int().nonnegative(),
  batteryPercent: z.number().min(0).max(100),
  adaptationPolicyApplied: z.boolean(),
  unsafeThrottleRegressionDetected: z.boolean()
});

const policySchema = z.object({
  maxSafeThermalState: z.number().int().nonnegative(),
  minimumBatteryPercentForFullQuality: z.number().min(0).max(100),
  requireThrottleRegressionProtection: z.boolean()
});

const fallback = {
  maxSafeThermalState: 2,
  minimumBatteryPercentForFullQuality: 30,
  requireThrottleRegressionProtection: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "thermal-battery-adaptation.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateThermalBatteryAdaptation(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const thermalSafe = parsed.data.thermalState <= policy.maxSafeThermalState;
  const batteryAdapted = parsed.data.batteryPercent >= policy.minimumBatteryPercentForFullQuality || parsed.data.adaptationPolicyApplied;
  const throttlingRegressionPrevented = !policy.requireThrottleRegressionProtection || !parsed.data.unsafeThrottleRegressionDetected;

  return {
    ok: true as const,
    adaptationReady: thermalSafe && batteryAdapted && throttlingRegressionPrevented,
    thermalSafe,
    batteryAdapted,
    throttlingRegressionPrevented
  };
}
