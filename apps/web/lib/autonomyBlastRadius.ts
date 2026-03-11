import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  maxRiskScore: z.number().min(0).max(1),
  maxAffectedDomains: z.number().int().positive(),
  maxAffectedUsers: z.number().int().nonnegative(),
  requireApprovalAboveRisk: z.number().min(0).max(1)
});

const requestSchema = z.object({
  actionId: z.string().min(1),
  riskScore: z.number().min(0).max(1),
  affectedDomains: z.array(z.string().min(1)).min(1),
  estimatedAffectedUsers: z.number().int().nonnegative()
});

const defaultPolicy = {
  maxRiskScore: 0.65,
  maxAffectedDomains: 2,
  maxAffectedUsers: 5000,
  requireApprovalAboveRisk: 0.45
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "autonomy-blast-radius-guardrails.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function evaluateBlastRadiusGuardrails(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  const request = parsed.data;

  const violations: string[] = [];
  if (request.riskScore > policy.maxRiskScore) violations.push("risk_score_exceeds_max");
  if (request.affectedDomains.length > policy.maxAffectedDomains) violations.push("affected_domains_exceed_max");
  if (request.estimatedAffectedUsers > policy.maxAffectedUsers) violations.push("affected_users_exceed_max");

  const approvalRequired = request.riskScore >= policy.requireApprovalAboveRisk;
  const allowed = violations.length === 0;

  return {
    ok: true as const,
    actionId: request.actionId,
    allowed,
    approvalRequired,
    violations,
    blastRadius: {
      riskScore: request.riskScore,
      affectedDomains: request.affectedDomains.length,
      estimatedAffectedUsers: request.estimatedAffectedUsers
    }
  };
}
