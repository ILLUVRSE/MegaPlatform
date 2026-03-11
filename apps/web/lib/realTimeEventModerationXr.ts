import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  moderationLatencyMs: z.number().nonnegative(),
  auditRecordWritten: z.boolean(),
  policyDecisionIdPresent: z.boolean()
});

const policySchema = z.object({
  maxModerationLatencyMs: z.number().nonnegative(),
  requireAuditRecord: z.boolean(),
  requirePolicyBinding: z.boolean()
});

const fallback = {
  maxModerationLatencyMs: 180,
  requireAuditRecord: true,
  requirePolicyBinding: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "real-time-event-moderation-xr.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateRealTimeEventModerationXr(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const latencyMet = parsed.data.moderationLatencyMs <= policy.maxModerationLatencyMs;
  const auditabilityMet = !policy.requireAuditRecord || parsed.data.auditRecordWritten;
  const policyBindingMet = !policy.requirePolicyBinding || parsed.data.policyDecisionIdPresent;

  return {
    ok: true as const,
    moderationReady: latencyMet && auditabilityMet && policyBindingMet,
    latencyMet,
    auditabilityMet,
    policyBindingMet
  };
}
