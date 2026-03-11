import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  certified: z.boolean(),
  readinessScore: z.number().min(0).max(1),
  goLiveRequested: z.boolean()
});

const policySchema = z.object({
  minimumReadinessScore: z.number().min(0).max(1),
  requireCertification: z.boolean(),
  allowGoLiveWhenNonCertified: z.boolean()
});

const fallback = {
  minimumReadinessScore: 0.9,
  requireCertification: true,
  allowGoLiveWhenNonCertified: false
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "event-readiness-certification-gate.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateEventReadinessCertificationGate(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const readinessScoreMet = parsed.data.readinessScore >= policy.minimumReadinessScore;
  const certificationMet = !policy.requireCertification || parsed.data.certified;
  const goLiveAllowed = !parsed.data.goLiveRequested || (readinessScoreMet && (certificationMet || policy.allowGoLiveWhenNonCertified));
  const constrainedByGate = parsed.data.goLiveRequested && !goLiveAllowed;

  return {
    ok: true as const,
    gateReady: readinessScoreMet && certificationMet,
    readinessScoreMet,
    certificationMet,
    goLiveAllowed,
    constrainedByGate
  };
}
