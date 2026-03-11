import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  maxActionSpendCents: z.number().int().positive(),
  maxHourlyAutonomySpendCents: z.number().int().positive(),
  minRemainingBudgetRatio: z.number().min(0).max(1),
  throttleMultiplier: z.number().min(0).max(1),
  blockedActionTypes: z.array(z.string().min(1))
});

const requestSchema = z.object({
  actionId: z.string().min(1),
  actionType: z.string().min(1),
  estimatedSpendCents: z.number().int().nonnegative(),
  spentLastHourCents: z.number().int().nonnegative(),
  remainingBudgetCents: z.number().int().nonnegative(),
  totalBudgetCents: z.number().int().positive()
});

const defaultPolicy = {
  maxActionSpendCents: 2500,
  maxHourlyAutonomySpendCents: 20000,
  minRemainingBudgetRatio: 0.15,
  throttleMultiplier: 0.5,
  blockedActionTypes: ["high_risk_experiment"]
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "autonomous-finance-controller.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function evaluateAutonomousFinanceAction(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const remainingRatio =
    parsed.data.totalBudgetCents === 0 ? 0 : parsed.data.remainingBudgetCents / parsed.data.totalBudgetCents;

  const blockers: string[] = [];
  if (policy.blockedActionTypes.includes(parsed.data.actionType)) blockers.push("blocked_action_type");
  if (parsed.data.estimatedSpendCents > policy.maxActionSpendCents) blockers.push("action_spend_limit_exceeded");
  if (parsed.data.spentLastHourCents + parsed.data.estimatedSpendCents > policy.maxHourlyAutonomySpendCents) {
    blockers.push("hourly_budget_limit_exceeded");
  }
  if (remainingRatio < policy.minRemainingBudgetRatio) blockers.push("remaining_budget_ratio_too_low");

  const gating = blockers.length > 0 ? "blocked" : "allowed";
  const throttledSpendCents = Math.round(parsed.data.estimatedSpendCents * policy.throttleMultiplier);

  return {
    ok: true as const,
    actionId: parsed.data.actionId,
    gating,
    blockers,
    remainingRatio,
    budget: {
      estimatedSpendCents: parsed.data.estimatedSpendCents,
      spentLastHourCents: parsed.data.spentLastHourCents,
      remainingBudgetCents: parsed.data.remainingBudgetCents,
      totalBudgetCents: parsed.data.totalBudgetCents,
      throttledSpendCents
    },
    policy
  };
}
