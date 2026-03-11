import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  lowRiskMax: z.number().min(0).max(1),
  mediumRiskMax: z.number().min(0).max(1),
  frictionByTier: z.record(z.string(), z.array(z.string().min(1)).min(1)),
  maxInterventionsPerSession: z.number().int().positive()
});

const requestSchema = z.object({
  sessionId: z.string().min(1),
  riskScore: z.number().min(0).max(1),
  priorInterventions: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1)
});

const defaultPolicy = {
  lowRiskMax: 0.3,
  mediumRiskMax: 0.65,
  frictionByTier: {
    low: ["none"],
    medium: ["confirm_action", "rate_limit"],
    high: ["step_up_auth", "manual_review"]
  },
  maxInterventionsPerSession: 3
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "adaptive-friction-system.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function evaluateAdaptiveFriction(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const tier =
    parsed.data.riskScore <= policy.lowRiskMax
      ? "low"
      : parsed.data.riskScore <= policy.mediumRiskMax
        ? "medium"
        : "high";

  const interventionCapReached = parsed.data.priorInterventions >= policy.maxInterventionsPerSession;
  const confidenceLow = parsed.data.confidence < 0.5;

  const interventions = interventionCapReached ? ["manual_review"] : (policy.frictionByTier[tier] ?? ["none"]);
  const enforcedInterventions = confidenceLow ? Array.from(new Set([...interventions, "manual_review"])) : interventions;

  return {
    ok: true as const,
    tier,
    interventions: enforcedInterventions,
    interventionCapReached
  };
}
