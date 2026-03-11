import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const outcomeSchema = z.enum(["allow", "restrict", "block"]);

const requestSchema = z.object({
  traceabilityId: z.string().min(1),
  decisionRationale: z.string().min(1),
  evidenceLinks: z.array(z.string().min(1)),
  outcome: outcomeSchema,
  humanReviewer: z.string().min(1)
});

const policySchema = z.object({
  minimumEvidenceLinks: z.number().int().positive(),
  allowedOutcomes: z.array(outcomeSchema),
  requireHumanReviewer: z.boolean(),
  requireDecisionRationale: z.boolean(),
  requireTraceabilityId: z.boolean()
});

const fallback = {
  minimumEvidenceLinks: 2,
  allowedOutcomes: ["allow", "restrict", "block"] as const,
  requireHumanReviewer: true,
  requireDecisionRationale: true,
  requireTraceabilityId: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "xr-audit-explainability-bundle.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function generateXrAuditExplainabilityBundle(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const traceabilityCompliant = !policy.requireTraceabilityId || parsed.data.traceabilityId.trim().length > 0;
  const rationaleCompliant = !policy.requireDecisionRationale || parsed.data.decisionRationale.trim().length > 0;
  const evidenceCompliant = parsed.data.evidenceLinks.length >= policy.minimumEvidenceLinks;
  const outcomeCompliant = policy.allowedOutcomes.includes(parsed.data.outcome);
  const reviewerCompliant = !policy.requireHumanReviewer || parsed.data.humanReviewer.trim().length > 0;

  return {
    ok: true as const,
    bundleCompliant: traceabilityCompliant && rationaleCompliant && evidenceCompliant && outcomeCompliant && reviewerCompliant,
    bundle: {
      traceabilityId: parsed.data.traceabilityId,
      rationale: parsed.data.decisionRationale,
      evidenceLinks: parsed.data.evidenceLinks,
      outcome: parsed.data.outcome,
      reviewer: parsed.data.humanReviewer
    },
    traceabilityCompliant,
    rationaleCompliant,
    evidenceCompliant,
    outcomeCompliant,
    reviewerCompliant
  };
}
