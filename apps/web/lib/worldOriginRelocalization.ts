import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  maxOriginDriftMeters: z.number().nonnegative(),
  maxReconnectRecoveryMs: z.number().int().positive(),
  minimumContinuityScore: z.number().min(0).max(1)
});

const requestSchema = z.object({
  driftMeters: z.number().nonnegative(),
  reconnectRecoveryMs: z.number().int().nonnegative(),
  continuityScore: z.number().min(0).max(1),
  hasCachedOrigin: z.boolean()
});

const fallback = { maxOriginDriftMeters: 0.25, maxReconnectRecoveryMs: 1500, minimumContinuityScore: 0.9 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "world-origin-relocalization.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateWorldOriginRelocalization(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const recoveryPath = parsed.data.hasCachedOrigin ? "cached_origin_rebind" : "full_space_reacquire";
  const driftStable = parsed.data.driftMeters <= policy.maxOriginDriftMeters;
  const reconnectStable = parsed.data.reconnectRecoveryMs <= policy.maxReconnectRecoveryMs;
  const continuityStable = parsed.data.continuityScore >= policy.minimumContinuityScore;

  return {
    ok: true as const,
    recoveryPath,
    continuityPreserved: driftStable && reconnectStable && continuityStable,
    driftStable,
    reconnectStable,
    continuityStable
  };
}
