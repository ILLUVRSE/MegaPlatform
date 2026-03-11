import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  patternId: z.string().min(1),
  participantCount: z.number().int().nonnegative(),
  deterministicSeedProvided: z.boolean(),
  requestedAmplitude: z.number().nonnegative(),
  requestedVelocity: z.number().nonnegative()
});

const policySchema = z.object({
  supportedPatterns: z.array(z.string().min(1)).min(1),
  maxParticipantsPerPattern: z.number().int().positive(),
  safetyCaps: z.object({
    maxAmplitude: z.number().positive(),
    maxVelocity: z.number().positive()
  })
});

const fallback = {
  supportedPatterns: ["wave", "pulse", "cheer_burst"],
  maxParticipantsPerPattern: 5000,
  safetyCaps: {
    maxAmplitude: 0.8,
    maxVelocity: 1.4
  }
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "audience-choreography-engine.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateAudienceChoreographyEngine(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const supportedPattern = policy.supportedPatterns.includes(parsed.data.patternId);
  const participantsWithinCap = parsed.data.participantCount <= policy.maxParticipantsPerPattern;
  const amplitudeWithinCap = parsed.data.requestedAmplitude <= policy.safetyCaps.maxAmplitude;
  const velocityWithinCap = parsed.data.requestedVelocity <= policy.safetyCaps.maxVelocity;
  const deterministicPatterns = parsed.data.deterministicSeedProvided && supportedPattern;

  return {
    ok: true as const,
    choreographyReady: deterministicPatterns && participantsWithinCap && amplitudeWithinCap && velocityWithinCap,
    deterministicPatterns,
    participantsWithinCap,
    amplitudeWithinCap,
    velocityWithinCap
  };
}
