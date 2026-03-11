import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  explicitConsentGranted: z.boolean(),
  consentAgeMinutes: z.number().nonnegative(),
  sessionScopedConsent: z.boolean(),
  consentRevoked: z.boolean(),
  youthSession: z.boolean(),
  guardianConsentGranted: z.boolean()
});

const policySchema = z.object({
  requireExplicitConsent: z.boolean(),
  requireSessionScopedConsent: z.boolean(),
  allowRecordingAfterRevocation: z.boolean(),
  maxConsentAgeMinutes: z.number().nonnegative(),
  requireGuardianConsentForYouth: z.boolean()
});

const fallback = {
  requireExplicitConsent: true,
  requireSessionScopedConsent: true,
  allowRecordingAfterRevocation: false,
  maxConsentAgeMinutes: 240,
  requireGuardianConsentForYouth: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), "ops", "governance", "consent-session-recording-controls.json"),
      "utf-8"
    );
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateConsentSessionRecordingControls(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const explicitConsentCompliant = !policy.requireExplicitConsent || parsed.data.explicitConsentGranted;
  const sessionScopedConsentCompliant = !policy.requireSessionScopedConsent || parsed.data.sessionScopedConsent;
  const consentFreshnessCompliant = parsed.data.consentAgeMinutes <= policy.maxConsentAgeMinutes;
  const revocationCompliant = policy.allowRecordingAfterRevocation || !parsed.data.consentRevoked;
  const guardianConsentCompliant =
    !policy.requireGuardianConsentForYouth || !parsed.data.youthSession || parsed.data.guardianConsentGranted;

  return {
    ok: true as const,
    recordingAllowed:
      explicitConsentCompliant &&
      sessionScopedConsentCompliant &&
      consentFreshnessCompliant &&
      revocationCompliant &&
      guardianConsentCompliant,
    explicitConsentCompliant,
    sessionScopedConsentCompliant,
    consentFreshnessCompliant,
    revocationCompliant,
    guardianConsentCompliant
  };
}
