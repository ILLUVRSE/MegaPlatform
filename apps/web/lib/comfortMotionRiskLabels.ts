import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  motionIntensity: z.number().min(0).max(1),
  accelerationPeaksPerMinute: z.number().nonnegative(),
  priorDiscomfortIncidents: z.number().int().nonnegative(),
  comfortAidsEnabled: z.boolean()
});

const policySchema = z.object({
  mediumRiskMotionIntensity: z.number().min(0).max(1),
  highRiskMotionIntensity: z.number().min(0).max(1),
  mediumRiskAccelerationPeaksPerMinute: z.number().nonnegative(),
  highRiskAccelerationPeaksPerMinute: z.number().nonnegative(),
  incidentWeight: z.number().nonnegative(),
  comfortAidCredit: z.number().nonnegative()
});

const fallback = {
  mediumRiskMotionIntensity: 0.45,
  highRiskMotionIntensity: 0.75,
  mediumRiskAccelerationPeaksPerMinute: 12,
  highRiskAccelerationPeaksPerMinute: 20,
  incidentWeight: 0.08,
  comfortAidCredit: 0.12
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "comfort-motion-risk-labels.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

type ComfortRiskLabel = "low" | "medium" | "high";

export async function generateComfortMotionRiskLabel(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const incidentRisk = parsed.data.priorDiscomfortIncidents * policy.incidentWeight;
  const comfortCredit = parsed.data.comfortAidsEnabled ? policy.comfortAidCredit : 0;
  const normalizedScore = Math.max(
    0,
    Math.min(1, parsed.data.motionIntensity + incidentRisk + parsed.data.accelerationPeaksPerMinute / 100 - comfortCredit)
  );

  const highRisk =
    normalizedScore >= policy.highRiskMotionIntensity ||
    parsed.data.accelerationPeaksPerMinute >= policy.highRiskAccelerationPeaksPerMinute;
  const mediumRisk =
    normalizedScore >= policy.mediumRiskMotionIntensity ||
    parsed.data.accelerationPeaksPerMinute >= policy.mediumRiskAccelerationPeaksPerMinute;

  let riskLabel: ComfortRiskLabel = "low";
  if (highRisk) riskLabel = "high";
  else if (mediumRisk) riskLabel = "medium";

  return {
    ok: true as const,
    riskLabel,
    normalizedScore,
    preSessionDisclosureRequired: riskLabel !== "low",
    requireAcknowledgementBeforeEntry: riskLabel !== "low"
  };
}
