import { NextResponse } from "next/server";
import { evaluatePolicyDecision, type PolicyDecisionInput } from "@/lib/policyEngine";
import { writePolicyAudit } from "@/lib/audit";

type EnforceAdminPolicyInput = PolicyDecisionInput & {
  adminId: string;
  policy?: unknown;
  policyPath?: string;
};

export async function enforceAdminPolicy(input: EnforceAdminPolicyInput) {
  const decision = await evaluatePolicyDecision(
    {
      scope: input.scope,
      action: input.action,
      target: input.target,
      attributes: input.attributes
    },
    {
      policy: input.policy,
      policyPath: input.policyPath
    }
  );

  await writePolicyAudit(input.adminId, {
    scope: input.scope,
    action: input.action,
    resource: input.target?.resource,
    operation: input.target?.operation,
    targetId: input.target?.id,
    allow: decision.allow,
    effect: decision.ok ? decision.effect : undefined,
    reason: decision.reason,
    matchedRuleId: decision.matchedRuleId,
    policyVersion: decision.policyVersion,
    attributes: input.attributes
  });

  return decision;
}

export function policyViolationResponse(decision: Awaited<ReturnType<typeof enforceAdminPolicy>>) {
  return NextResponse.json({ ok: false, error: "policy_violation", decision }, { status: 403 });
}
