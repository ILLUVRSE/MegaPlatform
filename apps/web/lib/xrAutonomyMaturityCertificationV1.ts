import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  safetyScore: z.number().min(0).max(1),
  complianceScore: z.number().min(0).max(1),
  performanceScore: z.number().min(0).max(1),
  evidenceArtifacts: z.number().int().nonnegative(),
  humanSignoffPresent: z.boolean()
});

const policySchema = z.object({
  minimumSafetyScore: z.number().min(0).max(1),
  minimumComplianceScore: z.number().min(0).max(1),
  minimumPerformanceScore: z.number().min(0).max(1),
  minimumEvidenceArtifacts: z.number().int().positive(),
  requireHumanSignoff: z.boolean()
});

const fallback = {
  minimumSafetyScore: 0.9,
  minimumComplianceScore: 0.92,
  minimumPerformanceScore: 0.88,
  minimumEvidenceArtifacts: 3,
  requireHumanSignoff: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "xr-autonomy-maturity-certification-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateXrAutonomyMaturityCertificationV1(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const safetyCompliant = parsed.data.safetyScore >= policy.minimumSafetyScore;
  const complianceCompliant = parsed.data.complianceScore >= policy.minimumComplianceScore;
  const performanceCompliant = parsed.data.performanceScore >= policy.minimumPerformanceScore;
  const evidenceCompliant = parsed.data.evidenceArtifacts >= policy.minimumEvidenceArtifacts;
  const signoffCompliant = !policy.requireHumanSignoff || parsed.data.humanSignoffPresent;

  return {
    ok: true as const,
    maturityCertified: safetyCompliant && complianceCompliant && performanceCompliant && evidenceCompliant && signoffCompliant,
    safetyCompliant,
    complianceCompliant,
    performanceCompliant,
    evidenceCompliant,
    signoffCompliant
  };
}
