import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  vectionIntensity: z.number().min(0).max(1),
  angularVelocityDps: z.number().nonnegative(),
  frameTimeVarianceMs: z.number().nonnegative(),
  sessionDurationMinutes: z.number().nonnegative(),
  mitigationPromptShown: z.boolean(),
  safeModeEnabled: z.boolean()
});

const policySchema = z.object({
  highRiskScoreThreshold: z.number().min(0).max(1),
  safeModeDefaultThreshold: z.number().min(0).max(1),
  vectionWeight: z.number().nonnegative(),
  angularVelocityWeight: z.number().nonnegative(),
  frameTimeVarianceWeight: z.number().nonnegative(),
  durationWeight: z.number().nonnegative()
});

const fallback = {
  highRiskScoreThreshold: 0.7,
  safeModeDefaultThreshold: 0.85,
  vectionWeight: 0.35,
  angularVelocityWeight: 0.25,
  frameTimeVarianceWeight: 0.2,
  durationWeight: 0.2
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "motion-sickness-risk-scoring.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function scoreMotionSicknessRisk(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const normalizedAngularVelocity = Math.min(1, parsed.data.angularVelocityDps / 360);
  const normalizedFrameVariance = Math.min(1, parsed.data.frameTimeVarianceMs / 20);
  const normalizedDuration = Math.min(1, parsed.data.sessionDurationMinutes / 60);
  const riskScore =
    parsed.data.vectionIntensity * policy.vectionWeight +
    normalizedAngularVelocity * policy.angularVelocityWeight +
    normalizedFrameVariance * policy.frameTimeVarianceWeight +
    normalizedDuration * policy.durationWeight;

  const highRiskSession = riskScore >= policy.highRiskScoreThreshold;
  const safeModeDefaultRequired = riskScore >= policy.safeModeDefaultThreshold;
  const mitigationPromptRequired = highRiskSession;

  return {
    ok: true as const,
    riskScore,
    highRiskSession,
    mitigationPromptRequired,
    safeModeDefaultRequired,
    mitigationPromptCompliant: !mitigationPromptRequired || parsed.data.mitigationPromptShown,
    safeModeCompliant: !safeModeDefaultRequired || parsed.data.safeModeEnabled
  };
}
