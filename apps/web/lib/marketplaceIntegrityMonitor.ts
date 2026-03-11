import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  fraudRiskBlockThreshold: z.number().min(0).max(1),
  fraudRiskReviewThreshold: z.number().min(0).max(1),
  maxViolationsBeforeSuspend: z.number().int().positive(),
  remediationActions: z.array(z.string().min(1))
});

const requestSchema = z.object({
  entityId: z.string().min(1),
  fraudRisk: z.number().min(0).max(1),
  violationsLast30d: z.number().int().nonnegative()
});

const defaultPolicy = {
  fraudRiskBlockThreshold: 0.8,
  fraudRiskReviewThreshold: 0.55,
  maxViolationsBeforeSuspend: 3,
  remediationActions: ["throttle_payouts", "manual_review", "suspend_listing"]
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "marketplace-integrity-monitor.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : defaultPolicy;
  } catch {
    return defaultPolicy;
  }
}

export async function evaluateMarketplaceIntegrity(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const policy = await loadPolicy();
  const mustSuspend = parsed.data.violationsLast30d >= policy.maxViolationsBeforeSuspend;
  const isBlocked = parsed.data.fraudRisk >= policy.fraudRiskBlockThreshold || mustSuspend;
  const isReview = parsed.data.fraudRisk >= policy.fraudRiskReviewThreshold;

  const status = isBlocked ? "blocked" : isReview ? "review" : "clear";
  const remediation =
    status === "clear"
      ? []
      : status === "blocked"
        ? policy.remediationActions
        : policy.remediationActions.filter((a) => a !== "suspend_listing");

  return { ok: true as const, entityId: parsed.data.entityId, status, remediation, policy };
}
