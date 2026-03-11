import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  fraudRiskScore: z.number().min(0).max(1),
  transactionsPerMinute: z.number().nonnegative(),
  deviceTrusted: z.boolean(),
  identityConfidenceScore: z.number().min(0).max(1)
});

const policySchema = z.object({
  throttleRiskThreshold: z.number().min(0).max(1),
  haltRiskThreshold: z.number().min(0).max(1),
  maxTransactionsPerMinute: z.number().positive(),
  requireDeviceTrustCheck: z.boolean(),
  requireIdentityConfidenceFloor: z.number().min(0).max(1)
});

const fallback = {
  throttleRiskThreshold: 0.7,
  haltRiskThreshold: 0.9,
  maxTransactionsPerMinute: 6,
  requireDeviceTrustCheck: true,
  requireIdentityConfidenceFloor: 0.75
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "xr-asset-marketplace-fraud-controls.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateXrAssetMarketplaceFraudControls(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const velocityViolation = parsed.data.transactionsPerMinute > policy.maxTransactionsPerMinute;
  const deviceTrustCompliant = !policy.requireDeviceTrustCheck || parsed.data.deviceTrusted;
  const identityCompliant = parsed.data.identityConfidenceScore >= policy.requireIdentityConfidenceFloor;

  const shouldHalt = parsed.data.fraudRiskScore >= policy.haltRiskThreshold || !deviceTrustCompliant || !identityCompliant;
  const shouldThrottle = !shouldHalt && (parsed.data.fraudRiskScore >= policy.throttleRiskThreshold || velocityViolation);

  return {
    ok: true as const,
    fraudControlAction: shouldHalt ? "halt" : shouldThrottle ? "throttle" : "allow",
    shouldHalt,
    shouldThrottle,
    velocityViolation,
    deviceTrustCompliant,
    identityCompliant
  };
}
