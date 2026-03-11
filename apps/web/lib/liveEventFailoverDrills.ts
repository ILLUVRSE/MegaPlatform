import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  recoveryTimeMs: z.number().nonnegative(),
  runbookEvidenceRecorded: z.boolean(),
  recoveryEvidenceRecorded: z.boolean()
});

const policySchema = z.object({
  maxRecoveryTimeMs: z.number().nonnegative(),
  requireRunbookEvidence: z.boolean(),
  requireDrillEvidence: z.boolean()
});

const fallback = {
  maxRecoveryTimeMs: 30000,
  requireRunbookEvidence: true,
  requireDrillEvidence: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "live-event-failover-drills.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateLiveEventFailoverDrills(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const recoveryTimeMet = parsed.data.recoveryTimeMs <= policy.maxRecoveryTimeMs;
  const runbookEvidenceMet = !policy.requireRunbookEvidence || parsed.data.runbookEvidenceRecorded;
  const drillEvidenceMet = !policy.requireDrillEvidence || parsed.data.recoveryEvidenceRecorded;

  return {
    ok: true as const,
    failoverDrillReady: recoveryTimeMet && runbookEvidenceMet && drillEvidenceMet,
    recoveryTimeMet,
    runbookEvidenceMet,
    drillEvidenceMet
  };
}
