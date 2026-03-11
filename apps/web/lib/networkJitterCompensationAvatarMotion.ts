import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  continuityScore: z.number().min(0).max(1),
  authorityDivergence: z.number().min(0).max(1),
  compensationLatencyMs: z.number().nonnegative()
});

const policySchema = z.object({
  minimumContinuityScore: z.number().min(0).max(1),
  maxAuthorityDivergence: z.number().min(0).max(1),
  maxCompensationLatencyMs: z.number().nonnegative()
});

const fallback = {
  minimumContinuityScore: 0.85,
  maxAuthorityDivergence: 0.03,
  maxCompensationLatencyMs: 120
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), "ops", "governance", "network-jitter-compensation-avatar-motion.json"),
      "utf-8"
    );
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateNetworkJitterCompensationAvatarMotion(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const continuityImproved = parsed.data.continuityScore >= policy.minimumContinuityScore;
  const authoritySafe = parsed.data.authorityDivergence <= policy.maxAuthorityDivergence;
  const compensationLatencyMet = parsed.data.compensationLatencyMs <= policy.maxCompensationLatencyMs;

  return {
    ok: true as const,
    jitterCompensationReady: continuityImproved && authoritySafe && compensationLatencyMet,
    continuityImproved,
    authoritySafe,
    compensationLatencyMet
  };
}
