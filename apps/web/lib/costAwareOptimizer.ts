import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  maxActionCostCents: z.number().int().positive(),
  maxPlanCostCents: z.number().int().positive()
});

const actionSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  estimatedCostCents: z.number().int().nonnegative()
});

const defaultPolicy = {
  maxActionCostCents: 1500,
  maxPlanCostCents: 5000
};

export async function loadCostAwarePolicy() {
  const fullPath = path.join(process.cwd(), "ops", "governance", "cost-aware-optimizer.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = policySchema.safeParse(parsed);
    if (!result.success) return defaultPolicy;
    return result.data;
  } catch {
    return defaultPolicy;
  }
}

export async function evaluateCostAwarePlan(actions: unknown) {
type CostBlocker = "invalid_actions" | "action_cost_limit_exceeded" | "plan_cost_limit_exceeded";

  const policy = await loadCostAwarePolicy();
  const parsed = z.array(actionSchema).safeParse(actions);
  if (!parsed.success) {
    return { policy, actions: [], totalCostCents: 0, pass: false, blockers: ["invalid_actions"] as CostBlocker[] };
  }

  const annotated = parsed.data.map((action) => ({
    ...action,
    pass: action.estimatedCostCents <= policy.maxActionCostCents
  }));
  const totalCostCents = annotated.reduce((sum, action) => sum + action.estimatedCostCents, 0);

  const blockers: CostBlocker[] = [];
  if (annotated.some((action) => !action.pass)) {
    blockers.push("action_cost_limit_exceeded");
  }
  if (totalCostCents > policy.maxPlanCostCents) {
    blockers.push("plan_cost_limit_exceeded");
  }

  return {
    policy,
    actions: annotated,
    totalCostCents,
    pass: blockers.length === 0,
    blockers,
    generatedAt: new Date().toISOString()
  };
}
