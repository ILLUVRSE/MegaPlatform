import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  storeChecklistPassed: z.boolean(),
  performanceCertificationPassed: z.boolean(),
  privacyDisclosuresPresent: z.boolean(),
  ageRatingAssigned: z.boolean(),
  blockingDefects: z.number().int().nonnegative()
});

const policySchema = z.object({
  requireStoreChecklist: z.boolean(),
  requirePerformanceCertification: z.boolean(),
  requirePrivacyDisclosures: z.boolean(),
  requireAgeRating: z.boolean(),
  maxBlockingDefects: z.number().int().nonnegative()
});

const fallback = {
  requireStoreChecklist: true,
  requirePerformanceCertification: true,
  requirePrivacyDisclosures: true,
  requireAgeRating: true,
  maxBlockingDefects: 0
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "xr-launch-readiness-store-compliance.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateXrLaunchReadinessStoreCompliance(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const checklistCompliant = !policy.requireStoreChecklist || parsed.data.storeChecklistPassed;
  const perfCompliant = !policy.requirePerformanceCertification || parsed.data.performanceCertificationPassed;
  const privacyCompliant = !policy.requirePrivacyDisclosures || parsed.data.privacyDisclosuresPresent;
  const ageRatingCompliant = !policy.requireAgeRating || parsed.data.ageRatingAssigned;
  const defectCompliant = parsed.data.blockingDefects <= policy.maxBlockingDefects;

  const launchReady = checklistCompliant && perfCompliant && privacyCompliant && ageRatingCompliant && defectCompliant;

  return {
    ok: true as const,
    launchReady,
    launchBlocked: !launchReady,
    checklistCompliant,
    perfCompliant,
    privacyCompliant,
    ageRatingCompliant,
    defectCompliant
  };
}
