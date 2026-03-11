import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  warningFraudIndex: z.number().min(0).max(1),
  criticalFraudIndex: z.number().min(0).max(1),
  throttleFactor: z.number().min(0).max(1),
  haltWhenCritical: z.boolean()
});

const requestSchema = z.object({
  rewardPoolId: z.string().min(1),
  requestedRewardCents: z.number().int().nonnegative(),
  fraudIndex: z.number().min(0).max(1)
});

const defaultPolicy = { warningFraudIndex: 0.5, criticalFraudIndex: 0.75, throttleFactor: 0.4, haltWhenCritical: true };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "fraud-adaptive-reward-guardrails.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : defaultPolicy;
  } catch {
    return defaultPolicy;
  }
}

export async function evaluateFraudAdaptiveReward(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const critical = parsed.data.fraudIndex >= policy.criticalFraudIndex;
  const warning = parsed.data.fraudIndex >= policy.warningFraudIndex;

  if (critical && policy.haltWhenCritical) {
    return { ok: true as const, decision: "halt", approvedRewardCents: 0, policy };
  }

  if (warning) {
    return {
      ok: true as const,
      decision: "throttle",
      approvedRewardCents: Math.round(parsed.data.requestedRewardCents * policy.throttleFactor),
      policy
    };
  }

  return { ok: true as const, decision: "allow", approvedRewardCents: parsed.data.requestedRewardCents, policy };
}
