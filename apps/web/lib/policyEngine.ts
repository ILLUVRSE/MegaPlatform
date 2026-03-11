import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const conditionSchema = z.object({
  key: z.string().min(1),
  operator: z.enum(["eq", "neq", "in", "not_in", "gte", "lte", "exists"]),
  value: z.unknown().optional()
});

const policyRuleSchema = z.object({
  id: z.string().min(1),
  scope: z.string().min(1),
  action: z.string().min(1),
  effect: z.enum(["allow", "deny"]),
  priority: z.number().int(),
  conditions: z.array(conditionSchema)
});

const policySchema = z.object({
  version: z.string().min(1),
  defaultEffect: z.enum(["allow", "deny"]),
  rules: z.array(policyRuleSchema)
});

const decisionInputSchema = z.object({
  scope: z.string().min(1),
  action: z.string().min(1),
  attributes: z.record(z.string(), z.unknown()).default({})
});

export type PolicyDecisionInput = z.infer<typeof decisionInputSchema>;

const defaultPolicy: z.infer<typeof policySchema> = {
  version: "2.0",
  defaultEffect: "deny",
  rules: []
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
    if (await exists(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

function matchesCondition(condition: z.infer<typeof conditionSchema>, attributes: Record<string, unknown>) {
  const observed = attributes[condition.key];
  switch (condition.operator) {
    case "eq":
      return observed === condition.value;
    case "neq":
      return observed !== condition.value;
    case "in":
      return Array.isArray(condition.value) ? condition.value.includes(observed) : false;
    case "not_in":
      return Array.isArray(condition.value) ? !condition.value.includes(observed) : true;
    case "gte":
      return typeof observed === "number" && typeof condition.value === "number" && observed >= condition.value;
    case "lte":
      return typeof observed === "number" && typeof condition.value === "number" && observed <= condition.value;
    case "exists":
      return condition.value === false ? typeof observed === "undefined" : typeof observed !== "undefined";
    default:
      return false;
  }
}

export async function loadPolicyEngineConfig() {
  const root = await findRepoRoot();
  const fullPath = path.join(root, "ops", "governance", "policy-engine-v2.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return {
      ...validated.data,
      rules: [...validated.data.rules].sort((a, b) => b.priority - a.priority)
    };
  } catch {
    return defaultPolicy;
  }
}

export async function evaluatePolicyDecision(rawInput: unknown) {
  const parsed = decisionInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false as const,
      allow: false,
      reason: "invalid_input",
      matchedRuleId: null,
      policyVersion: defaultPolicy.version
    };
  }

  const input = parsed.data;
  const policy = await loadPolicyEngineConfig();
  const candidateRules = policy.rules.filter((rule) => rule.scope === input.scope && rule.action === input.action);

  for (const rule of candidateRules) {
    const pass = rule.conditions.every((condition) => matchesCondition(condition, input.attributes));
    if (pass) {
      return {
        ok: true as const,
        allow: rule.effect === "allow",
        reason: `matched:${rule.id}`,
        matchedRuleId: rule.id,
        effect: rule.effect,
        policyVersion: policy.version
      };
    }
  }

  return {
    ok: true as const,
    allow: policy.defaultEffect === "allow",
    reason: "default_effect",
    matchedRuleId: null,
    effect: policy.defaultEffect,
    policyVersion: policy.version
  };
}
