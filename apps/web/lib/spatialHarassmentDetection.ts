import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  harassmentScore: z.number().min(0).max(1),
  nearestDistanceMeters: z.number().nonnegative(),
  repeatedPatternDetected: z.boolean(),
  evidenceEvents: z.number().int().nonnegative(),
  userReportsInSession: z.number().int().nonnegative()
});

const policySchema = z.object({
  minimumHarassmentScore: z.number().min(0).max(1),
  maxWarningDistanceMeters: z.number().positive(),
  requireRepeatedPattern: z.boolean(),
  minimumEvidenceEvents: z.number().int().positive(),
  autoEscalateThreshold: z.number().min(0).max(1)
});

const fallback = {
  minimumHarassmentScore: 0.75,
  maxWarningDistanceMeters: 1.2,
  requireRepeatedPattern: true,
  minimumEvidenceEvents: 3,
  autoEscalateThreshold: 0.9
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "spatial-harassment-detection.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function detectSpatialHarassment(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const scoreTriggered = parsed.data.harassmentScore >= policy.minimumHarassmentScore;
  const proximityTriggered = parsed.data.nearestDistanceMeters <= policy.maxWarningDistanceMeters;
  const repeatedPatternMet = !policy.requireRepeatedPattern || parsed.data.repeatedPatternDetected;
  const evidenceThresholdMet = parsed.data.evidenceEvents >= policy.minimumEvidenceEvents;

  const moderationSignal = scoreTriggered && proximityTriggered && repeatedPatternMet && evidenceThresholdMet;
  const escalationRequired = moderationSignal && parsed.data.harassmentScore >= policy.autoEscalateThreshold;

  return {
    ok: true as const,
    moderationSignal,
    escalationRequired,
    evidenceContext: {
      harassmentScore: parsed.data.harassmentScore,
      nearestDistanceMeters: parsed.data.nearestDistanceMeters,
      evidenceEvents: parsed.data.evidenceEvents,
      userReportsInSession: parsed.data.userReportsInSession
    }
  };
}
