import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  maxRiskScore: z.number().min(0).max(1),
  highPrivilegeActions: z.array(z.string().min(1)).min(1),
  requireDualApprovalAbove: z.number().min(0).max(1),
  maxActionsPerWindow: z.number().int().positive()
});

const requestSchema = z.object({
  actorId: z.string().min(1),
  action: z.string().min(1),
  riskSignals: z.record(z.string(), z.number().min(0).max(1)),
  recentActionCount: z.number().int().nonnegative()
});

const defaultPolicy = {
  maxRiskScore: 0.6,
  highPrivilegeActions: ["policy_edit", "prod_deploy", "bulk_delete", "secret_rotation"],
  requireDualApprovalAbove: 0.45,
  maxActionsPerWindow: 5
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "autonomous-insider-risk-controls.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function evaluateInsiderRiskControl(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  const request = parsed.data;

  const signalValues = Object.values(request.riskSignals);
  const baseRisk = signalValues.length > 0 ? signalValues.reduce((sum, value) => sum + value, 0) / signalValues.length : 0;

  const highPrivilege = policy.highPrivilegeActions.includes(request.action);
  const riskScore = Math.min(1, baseRisk + (highPrivilege ? 0.2 : 0) + (request.recentActionCount > policy.maxActionsPerWindow ? 0.2 : 0));

  const blocked = riskScore > policy.maxRiskScore;
  const dualApprovalRequired = riskScore >= policy.requireDualApprovalAbove || highPrivilege;

  return {
    ok: true as const,
    actorId: request.actorId,
    action: request.action,
    riskScore,
    blocked,
    highPrivilege,
    dualApprovalRequired,
    reasons: [
      highPrivilege ? "high_privilege_action" : null,
      request.recentActionCount > policy.maxActionsPerWindow ? "rate_window_exceeded" : null,
      blocked ? "max_risk_exceeded" : null
    ].filter((value): value is string => Boolean(value))
  };
}
