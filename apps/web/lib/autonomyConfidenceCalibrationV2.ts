import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({ maxCalibrationError: z.number().min(0), minimumSamples: z.number().int().min(1) });
const requestSchema = z.object({
  outcomes: z.array(z.object({ confidence: z.number().min(0).max(1), realizedSuccess: z.number().min(0).max(1) })).min(1)
});
const fallback = { maxCalibrationError: 0.15, minimumSamples: 3 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "autonomy-confidence-calibration-v2.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch { return fallback; }
}

export async function calibrateAutonomyConfidenceV2(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const samples = parsed.data.outcomes.length;
  const meanError = Number((parsed.data.outcomes.reduce((sum, o) => sum + Math.abs(o.confidence - o.realizedSuccess), 0) / samples).toFixed(4));
  const gate = samples >= policy.minimumSamples && meanError <= policy.maxCalibrationError ? "allow" : "constrain";

  return {
    ok: true as const,
    metrics: { samples, meanCalibrationError: meanError, threshold: policy.maxCalibrationError },
    executionGate: gate
  };
}
