import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  endpointClass: z.enum(["vr", "ar", "mixed"]),
  rolloutPercentRequested: z.number().min(0).max(100),
  certificationPassed: z.boolean(),
  regionalCompliancePassed: z.boolean(),
  fallbackPlanPresent: z.boolean()
});

const policySchema = z.object({
  maxRolloutPercentWithoutCertification: z.number().min(0).max(100),
  maxRolloutPercentWithCertification: z.number().min(0).max(100),
  allowEndpointClasses: z.array(z.enum(["vr", "ar", "mixed"])),
  requireRegionalCompliance: z.boolean(),
  requireFallbackPlan: z.boolean()
});

const fallback = {
  maxRolloutPercentWithoutCertification: 10,
  maxRolloutPercentWithCertification: 100,
  allowEndpointClasses: ["vr", "ar", "mixed"] as const,
  requireRegionalCompliance: true,
  requireFallbackPlan: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), "ops", "governance", "distribution-orchestrator-vr-ar-endpoints.json"),
      "utf-8"
    );
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function planDistributionOrchestratorVrArEndpoints(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const endpointAllowed = policy.allowEndpointClasses.includes(parsed.data.endpointClass);
  const maxRollout = parsed.data.certificationPassed
    ? policy.maxRolloutPercentWithCertification
    : policy.maxRolloutPercentWithoutCertification;
  const approvedRolloutPercent = Math.min(parsed.data.rolloutPercentRequested, maxRollout);
  const regionalCompliant = !policy.requireRegionalCompliance || parsed.data.regionalCompliancePassed;
  const fallbackPlanCompliant = !policy.requireFallbackPlan || parsed.data.fallbackPlanPresent;

  return {
    ok: true as const,
    policyCompliantActionPlan: endpointAllowed && regionalCompliant && fallbackPlanCompliant,
    actions: {
      approvedRolloutPercent,
      requireCanary: approvedRolloutPercent < 100,
      endpointClass: parsed.data.endpointClass
    },
    endpointAllowed,
    regionalCompliant,
    fallbackPlanCompliant
  };
}
