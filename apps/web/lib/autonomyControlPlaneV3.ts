import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
import { solveUnifiedConstraints } from "@/lib/unifiedConstraintSolver";
import { evaluateTemporalPolicyWindow } from "@/lib/temporalPolicyWindows";
import { evaluateAutonomyChangeBudget } from "@/lib/autonomyChangeBudgeting";
import { evaluateBlastRadiusGuardrails } from "@/lib/autonomyBlastRadius";

const policySchema = z.object({
  requiredChecks: z.array(z.string().min(1)).min(1),
  blockOn: z.array(z.string().min(1)).min(1),
  maxRecommendedActions: z.number().int().positive()
});

const requestSchema = z.object({
  domain: z.string().min(1),
  attributes: z.record(z.string(), z.string()).default({}),
  atIso: z.string().datetime().optional(),
  budget: z.object({
    changeClass: z.string().min(1),
    requestedUnits: z.number().int().positive(),
    consumedUnits: z.number().int().nonnegative()
  }),
  blastRadius: z.object({
    actionId: z.string().min(1),
    riskScore: z.number().min(0).max(1),
    affectedDomains: z.array(z.string().min(1)).min(1),
    estimatedAffectedUsers: z.number().int().nonnegative()
  })
});

const defaultPolicy = {
  requiredChecks: ["constraint", "temporal", "budget", "blast_radius"],
  blockOn: ["constraint:deny", "temporal:deny", "budget:blocked", "blast_radius:block"],
  maxRecommendedActions: 5
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "autonomy-control-plane-v3.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function evaluateAutonomyControlPlaneV3(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  const input = parsed.data;

  const constraint = await solveUnifiedConstraints({ domain: input.domain, attributes: input.attributes });
  const temporal = await evaluateTemporalPolicyWindow({ domain: input.domain, atIso: input.atIso });
  const budget = await evaluateAutonomyChangeBudget(input.budget);
  const blast = await evaluateBlastRadiusGuardrails(input.blastRadius);

  if (!constraint.ok || !temporal.ok || !budget.ok || !blast.ok) {
    return { ok: false as const, reason: "check_failure" };
  }

  const blockSignals = [
    `constraint:${constraint.decision}`,
    `temporal:${temporal.decision}`,
    `budget:${budget.status}`,
    `blast_radius:${blast.allowed ? "pass" : "block"}`
  ];

  const blockers = blockSignals.filter((signal) => policy.blockOn.includes(signal));
  const allowed = blockers.length === 0;

  const recommendedActions = [
    constraint.decision === "require_approval" ? "route_for_human_approval" : null,
    budget.status === "warning" ? "reduce_change_scope" : null,
    !blast.allowed ? "split_rollout_into_smaller_batches" : null,
    temporal.decision === "deny" ? "reschedule_within_policy_window" : null
  ]
    .filter((action): action is string => Boolean(action))
    .slice(0, policy.maxRecommendedActions);

  return {
    ok: true as const,
    allowed,
    blockers,
    checks: {
      constraint: {
        decision: constraint.decision,
        source: constraint.decisionSource
      },
      temporal: {
        decision: temporal.decision,
        matchedWindowId: temporal.matchedWindowId
      },
      budget: {
        status: budget.status,
        ratio: budget.ratio,
        allowed: budget.allowed
      },
      blastRadius: {
        allowed: blast.allowed,
        approvalRequired: blast.approvalRequired,
        violations: blast.violations
      }
    },
    recommendedActions
  };
}
