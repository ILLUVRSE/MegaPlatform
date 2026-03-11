import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  ageSegmentClassified: z.boolean(),
  safeLocomotionProfileEnabled: z.boolean(),
  voiceChatModerationEnabled: z.boolean(),
  guardianControlsEnabled: z.boolean(),
  safetyDefaultsScore: z.number().min(0).max(1)
});

const policySchema = z.object({
  requireAgeSegmentClassification: z.boolean(),
  requireSafeLocomotionProfile: z.boolean(),
  requireVoiceChatModeration: z.boolean(),
  requireGuardianControls: z.boolean(),
  minimumSafetyDefaultsScore: z.number().min(0).max(1)
});

const fallback = {
  requireAgeSegmentClassification: true,
  requireSafeLocomotionProfile: true,
  requireVoiceChatModeration: true,
  requireGuardianControls: true,
  minimumSafetyDefaultsScore: 0.9
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "youth-safe-xr-mode.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateYouthSafeXrMode(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const ageSegmentCompliant = !policy.requireAgeSegmentClassification || parsed.data.ageSegmentClassified;
  const safeLocomotionCompliant = !policy.requireSafeLocomotionProfile || parsed.data.safeLocomotionProfileEnabled;
  const voiceModerationCompliant = !policy.requireVoiceChatModeration || parsed.data.voiceChatModerationEnabled;
  const guardianControlCompliant = !policy.requireGuardianControls || parsed.data.guardianControlsEnabled;
  const safetyDefaultsCompliant = parsed.data.safetyDefaultsScore >= policy.minimumSafetyDefaultsScore;

  return {
    ok: true as const,
    youthSafeModeCompliant:
      ageSegmentCompliant &&
      safeLocomotionCompliant &&
      voiceModerationCompliant &&
      guardianControlCompliant &&
      safetyDefaultsCompliant,
    ageSegmentCompliant,
    safeLocomotionCompliant,
    voiceModerationCompliant,
    guardianControlCompliant,
    safetyDefaultsCompliant
  };
}
