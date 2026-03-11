import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  nearestDistanceMeters: z.number().nonnegative(),
  sustainedViolationSeconds: z.number().nonnegative(),
  comfortBoundaryBreaches: z.number().int().nonnegative(),
  hapticWarningApplied: z.boolean(),
  autoRepositionApplied: z.boolean(),
  interactionCooldownApplied: z.boolean()
});

const policySchema = z.object({
  minimumDistanceMeters: z.number().positive(),
  maximumViolationSecondsBeforeProtection: z.number().positive(),
  maxComfortBoundaryBreaches: z.number().int().nonnegative(),
  requireHapticWarning: z.boolean(),
  requireAutoReposition: z.boolean(),
  requireInteractionCooldown: z.boolean()
});

const fallback = {
  minimumDistanceMeters: 1,
  maximumViolationSecondsBeforeProtection: 2.5,
  maxComfortBoundaryBreaches: 2,
  requireHapticWarning: true,
  requireAutoReposition: true,
  requireInteractionCooldown: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "proximity-safety-envelopes.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateProximitySafetyEnvelopes(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const distanceViolation = parsed.data.nearestDistanceMeters < policy.minimumDistanceMeters;
  const prolongedViolation = parsed.data.sustainedViolationSeconds > policy.maximumViolationSecondsBeforeProtection;
  const comfortBreachViolation = parsed.data.comfortBoundaryBreaches > policy.maxComfortBoundaryBreaches;
  const envelopeViolation = distanceViolation || prolongedViolation || comfortBreachViolation;

  const hapticWarningCompliant = !policy.requireHapticWarning || parsed.data.hapticWarningApplied;
  const autoRepositionCompliant = !policy.requireAutoReposition || parsed.data.autoRepositionApplied;
  const cooldownCompliant = !policy.requireInteractionCooldown || parsed.data.interactionCooldownApplied;
  const runtimeProtectionsTriggered = envelopeViolation && hapticWarningCompliant && autoRepositionCompliant && cooldownCompliant;

  return {
    ok: true as const,
    envelopeViolation,
    runtimeProtectionsTriggered,
    hapticWarningCompliant,
    autoRepositionCompliant,
    cooldownCompliant
  };
}
