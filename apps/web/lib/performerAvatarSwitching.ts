import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  switchLatencyMs: z.number().nonnegative(),
  identityTokenStable: z.boolean(),
  sessionIdStable: z.boolean(),
  stateCarryoverComplete: z.boolean()
});

const policySchema = z.object({
  maxSwitchLatencyMs: z.number().nonnegative(),
  requireIdentityContinuity: z.boolean(),
  requireSessionContinuity: z.boolean(),
  requireStateCarryover: z.boolean()
});

const fallback = {
  maxSwitchLatencyMs: 400,
  requireIdentityContinuity: true,
  requireSessionContinuity: true,
  requireStateCarryover: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "performer-avatar-switching.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluatePerformerAvatarSwitching(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const latencyWithinBudget = parsed.data.switchLatencyMs <= policy.maxSwitchLatencyMs;
  const identityContinuityMet = !policy.requireIdentityContinuity || parsed.data.identityTokenStable;
  const sessionContinuityMet = !policy.requireSessionContinuity || parsed.data.sessionIdStable;
  const stateCarryoverMet = !policy.requireStateCarryover || parsed.data.stateCarryoverComplete;

  return {
    ok: true as const,
    switchReady: latencyWithinBudget && identityContinuityMet && sessionContinuityMet && stateCarryoverMet,
    latencyWithinBudget,
    identityContinuityMet,
    sessionContinuityMet,
    stateCarryoverMet
  };
}
