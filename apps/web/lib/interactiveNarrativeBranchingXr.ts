import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  deterministicSeedProvided: z.boolean(),
  replayAuditTrailEnabled: z.boolean(),
  activeBranchFanout: z.number().int().nonnegative()
});

const policySchema = z.object({
  requireDeterministicBranching: z.boolean(),
  requireReplayAuditTrail: z.boolean(),
  maxBranchFanout: z.number().int().positive()
});

const fallback = {
  requireDeterministicBranching: true,
  requireReplayAuditTrail: true,
  maxBranchFanout: 6
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "interactive-narrative-branching-xr.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateInteractiveNarrativeBranchingXr(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const deterministicBranchingMet = !policy.requireDeterministicBranching || parsed.data.deterministicSeedProvided;
  const replayAuditabilityMet = !policy.requireReplayAuditTrail || parsed.data.replayAuditTrailEnabled;
  const fanoutWithinBudget = parsed.data.activeBranchFanout <= policy.maxBranchFanout;

  return {
    ok: true as const,
    branchingReady: deterministicBranchingMet && replayAuditabilityMet && fanoutWithinBudget,
    deterministicBranchingMet,
    replayAuditabilityMet,
    fanoutWithinBudget
  };
}
