import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  currentBeatId: z.string().min(1),
  nextBeatId: z.string().min(1),
  transitionPolicyApplied: z.boolean(),
  interruptionRecovered: z.boolean(),
  recoveryDurationMs: z.number().nonnegative()
});

const policySchema = z.object({
  requirePolicyDrivenTransitions: z.boolean(),
  maxRecoveryWindowMs: z.number().nonnegative()
});

const fallback = { requirePolicyDrivenTransitions: true, maxRecoveryWindowMs: 1500 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "story-beat-orchestrator.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateStoryBeatOrchestrator(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const policyDriven = !policy.requirePolicyDrivenTransitions || parsed.data.transitionPolicyApplied;
  const recoveryMet = parsed.data.interruptionRecovered && parsed.data.recoveryDurationMs <= policy.maxRecoveryWindowMs;

  return {
    ok: true as const,
    orchestrationReady: policyDriven && recoveryMet,
    policyDriven,
    recoveryMet
  };
}
