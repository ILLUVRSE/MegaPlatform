import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  maxTrustRisk: z.number().min(0).max(1),
  maxSafetyRisk: z.number().min(0).max(1),
  requiredSignals: z.array(z.string().min(1)).min(1),
  blockedActions: z.array(z.string().min(1)).min(1)
});

const requestSchema = z.object({
  action: z.string().min(1),
  signals: z.record(z.string(), z.number().min(0).max(1))
});

const defaultPolicy = {
  maxTrustRisk: 0.35,
  maxSafetyRisk: 0.3,
  requiredSignals: ["trust_score", "safety_score", "abuse_score"],
  blockedActions: ["aggressive_push", "dark_pattern_nudge"]
};

async function exists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function findRepoRoot() {
  let current = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (await exists(path.join(current, "pnpm-workspace.yaml"))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

async function loadPolicy(root: string) {
  try {
    const raw = await fs.readFile(path.join(root, "ops", "governance", "trust-preserving-growth-engine.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function evaluateTrustPreservingGrowth(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const missingSignals = policy.requiredSignals.filter((signal) => parsed.data.signals[signal] === undefined);
  if (missingSignals.length > 0) {
    return { ok: false as const, reason: "missing_required_signals", missingSignals };
  }

  const trustRisk = 1 - parsed.data.signals.trust_score;
  const safetyRisk = 1 - parsed.data.signals.safety_score;

  const blockedReasons = [
    trustRisk > policy.maxTrustRisk ? "trust_risk_exceeded" : null,
    safetyRisk > policy.maxSafetyRisk ? "safety_risk_exceeded" : null,
    policy.blockedActions.includes(parsed.data.action) ? "action_policy_blocked" : null
  ].filter((value): value is string => Boolean(value));

  return {
    ok: true as const,
    allowed: blockedReasons.length === 0,
    blockedReasons,
    risk: { trustRisk, safetyRisk }
  };
}
