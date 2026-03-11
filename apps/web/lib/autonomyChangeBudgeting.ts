import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const budgetRowSchema = z.object({
  changeClass: z.string().min(1),
  maxUnits: z.number().int().positive()
});

const policySchema = z.object({
  period: z.enum(["daily", "weekly", "monthly"]),
  budgets: z.array(budgetRowSchema).min(1),
  warnAtRatio: z.number().min(0).max(1)
});

const requestSchema = z.object({
  changeClass: z.string().min(1),
  requestedUnits: z.number().int().positive(),
  consumedUnits: z.number().int().nonnegative()
});

const defaultPolicy = {
  period: "daily" as const,
  budgets: [
    { changeClass: "policy", maxUnits: 30 },
    { changeClass: "config", maxUnits: 50 },
    { changeClass: "runtime", maxUnits: 80 }
  ],
  warnAtRatio: 0.8
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "autonomy-change-budgeting.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function evaluateAutonomyChangeBudget(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  const request = parsed.data;

  const budgetRow = policy.budgets.find((row) => row.changeClass === request.changeClass);
  if (!budgetRow) return { ok: false as const, reason: "unknown_change_class" };

  const projectedUnits = request.consumedUnits + request.requestedUnits;
  const ratio = projectedUnits / budgetRow.maxUnits;
  const allowed = projectedUnits <= budgetRow.maxUnits;
  const status = !allowed ? "blocked" : ratio >= policy.warnAtRatio ? "warning" : "ok";

  return {
    ok: true as const,
    period: policy.period,
    changeClass: request.changeClass,
    maxUnits: budgetRow.maxUnits,
    consumedUnits: request.consumedUnits,
    requestedUnits: request.requestedUnits,
    projectedUnits,
    ratio,
    status,
    allowed
  };
}
