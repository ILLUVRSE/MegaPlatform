import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  qualityChecksPassed: z.boolean(),
  complianceChecksPassed: z.boolean(),
  distributionReady: z.boolean()
});

const policySchema = z.object({
  requireQualityChecks: z.boolean(),
  requireComplianceChecks: z.boolean()
});

const fallback = { requireQualityChecks: true, requireComplianceChecks: true };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "publish-to-xr-pipeline.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluatePublishToXrPipeline(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const qualityMet = !policy.requireQualityChecks || parsed.data.qualityChecksPassed;
  const complianceMet = !policy.requireComplianceChecks || parsed.data.complianceChecksPassed;

  return {
    ok: true as const,
    publishReady: qualityMet && complianceMet && parsed.data.distributionReady,
    qualityMet,
    complianceMet
  };
}
