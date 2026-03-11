import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
import { solveUnifiedConstraints } from "@/lib/unifiedConstraintSolver";
import { evaluateTemporalPolicyWindow } from "@/lib/temporalPolicyWindows";
import { evaluateBlastRadiusGuardrails } from "@/lib/autonomyBlastRadius";

const policySchema = z.object({
  includeTrace: z.boolean(),
  includeInputs: z.boolean(),
  maxTraceItems: z.number().int().positive(),
  requiredSections: z.array(z.string().min(1)).min(1)
});

const requestSchema = z.object({
  domain: z.string().min(1),
  attributes: z.record(z.string(), z.string()).default({}),
  blastRadius: z
    .object({
      actionId: z.string().min(1),
      riskScore: z.number().min(0).max(1),
      affectedDomains: z.array(z.string().min(1)).min(1),
      estimatedAffectedUsers: z.number().int().nonnegative()
    })
    .optional(),
  atIso: z.string().datetime().optional()
});

const defaultPolicy = {
  includeTrace: true,
  includeInputs: true,
  maxTraceItems: 50,
  requiredSections: ["constraint", "temporal", "blast_radius"]
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "policy-explainability.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function explainPolicyDecision(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  const input = parsed.data;

  const constraint = await solveUnifiedConstraints({
    domain: input.domain,
    attributes: input.attributes
  });
  const temporal = await evaluateTemporalPolicyWindow({
    domain: input.domain,
    atIso: input.atIso
  });
  const blast = input.blastRadius ? await evaluateBlastRadiusGuardrails(input.blastRadius) : null;

  if (!constraint.ok || !temporal.ok || (blast && !blast.ok)) {
    return { ok: false as const, reason: "upstream_evaluation_failed" };
  }

  const sections = {
    constraint: {
      decision: constraint.decision,
      decisionSource: constraint.decisionSource,
      conflict: constraint.conflict,
      matchedRuleCount: constraint.matchedRuleCount,
      trace: policy.includeTrace ? constraint.trace.slice(0, policy.maxTraceItems) : []
    },
    temporal: {
      decision: temporal.decision,
      matchedWindowId: temporal.matchedWindowId,
      evaluatedAt: temporal.evaluatedAt
    },
    blast_radius: blast
      ? {
          allowed: blast.allowed,
          approvalRequired: blast.approvalRequired,
          violations: blast.violations
        }
      : null
  };

  return {
    ok: true as const,
    explainability: {
      sections,
      requiredSections: policy.requiredSections,
      inputs: policy.includeInputs ? input : null
    }
  };
}
