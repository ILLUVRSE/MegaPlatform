import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  performanceConsentPresent: z.boolean(),
  licenseTokenPresent: z.boolean(),
  territoryCovered: z.boolean(),
  rightsExpired: z.boolean(),
  rightsMismatchDetected: z.boolean()
});

const policySchema = z.object({
  requirePerformanceConsent: z.boolean(),
  requireLicenseToken: z.boolean(),
  requireTerritoryCoverage: z.boolean(),
  requireExpirationCheck: z.boolean(),
  blockOnRightsMismatch: z.boolean()
});

const fallback = {
  requirePerformanceConsent: true,
  requireLicenseToken: true,
  requireTerritoryCoverage: true,
  requireExpirationCheck: true,
  blockOnRightsMismatch: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), "ops", "governance", "animation-performance-rights-automation.json"),
      "utf-8"
    );
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function validateAnimationPerformanceRightsAutomation(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const consentCompliant = !policy.requirePerformanceConsent || parsed.data.performanceConsentPresent;
  const licenseCompliant = !policy.requireLicenseToken || parsed.data.licenseTokenPresent;
  const territoryCompliant = !policy.requireTerritoryCoverage || parsed.data.territoryCovered;
  const expirationCompliant = !policy.requireExpirationCheck || !parsed.data.rightsExpired;
  const mismatchCompliant = !policy.blockOnRightsMismatch || !parsed.data.rightsMismatchDetected;

  return {
    ok: true as const,
    rightsAutomationCompliant: consentCompliant && licenseCompliant && territoryCompliant && expirationCompliant && mismatchCompliant,
    consentCompliant,
    licenseCompliant,
    territoryCompliant,
    expirationCompliant,
    mismatchCompliant
  };
}
