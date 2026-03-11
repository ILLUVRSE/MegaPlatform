import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
import { compileAutonomyPolicies } from "@/lib/autonomyPolicyCompiler";

const policySchema = z.object({
  effectOrder: z.array(z.enum(["allow", "deny", "require_approval"])).min(1),
  globalScopeKey: z.string().min(1),
  emitTrace: z.boolean(),
  maxTraceRules: z.number().int().positive()
});

const inputSchema = z.object({
  domain: z.string().min(1),
  attributes: z.record(z.string(), z.string()).default({})
});

const defaultPolicy = {
  effectOrder: ["deny", "require_approval", "allow"] as const,
  globalScopeKey: "global",
  emitTrace: true,
  maxTraceRules: 25
};

const effectRank = new Map([
  ["deny", 0],
  ["require_approval", 1],
  ["allow", 2]
]);

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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "unified-constraint-solver.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

function matchesRule(
  rule: {
    scope: string;
    normalizedConditions: Array<{ key: string; values: string[] }>;
  },
  domain: string,
  globalScopeKey: string,
  attributes: Record<string, string>
) {
  if (rule.scope !== globalScopeKey && rule.scope !== domain) {
    return false;
  }

  return rule.normalizedConditions.every((condition) => {
    const value = attributes[condition.key];
    if (!value) return false;
    return condition.values.includes(value);
  });
}

function sortByStrictness(
  left: { priority: number; effect: "allow" | "deny" | "require_approval"; id: string },
  right: { priority: number; effect: "allow" | "deny" | "require_approval"; id: string }
) {
  const priorityDiff = right.priority - left.priority;
  if (priorityDiff !== 0) return priorityDiff;

  const leftRank = effectRank.get(left.effect) ?? Number.MAX_SAFE_INTEGER;
  const rightRank = effectRank.get(right.effect) ?? Number.MAX_SAFE_INTEGER;
  if (leftRank !== rightRank) return leftRank - rightRank;
  return left.id.localeCompare(right.id);
}

export async function solveUnifiedConstraints(rawInput: unknown) {
  const parsedInput = inputSchema.safeParse(rawInput);
  if (!parsedInput.success) return { ok: false as const, reason: "invalid_input" };

  const compileResult = await compileAutonomyPolicies();
  if (!compileResult.ok) {
    return {
      ok: false as const,
      reason: "compile_failed",
      errors: compileResult.errors
    };
  }

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  const domain = parsedInput.data.domain;
  const attributes = parsedInput.data.attributes;

  const matchedRules = compileResult.artifact.compiledRules
    .filter((rule) => matchesRule(rule, domain, policy.globalScopeKey, attributes))
    .sort(sortByStrictness);

  const winningRule = matchedRules[0] ?? null;
  const tiedTop = winningRule
    ? matchedRules.filter((rule) => rule.priority === winningRule.priority && rule.effect !== winningRule.effect)
    : [];

  const decision = winningRule
    ? winningRule.effect
    : (compileResult.artifact.defaultEffect as "allow" | "deny" | "require_approval");

  return {
    ok: true as const,
    decision,
    decisionSource: winningRule ? winningRule.id : "default_effect",
    conflict: tiedTop.length > 0,
    trace: policy.emitTrace
      ? matchedRules.slice(0, policy.maxTraceRules).map((rule) => ({
          id: rule.id,
          scope: rule.scope,
          effect: rule.effect,
          priority: rule.priority,
          executableKey: rule.executableKey
        }))
      : [],
    matchedRuleCount: matchedRules.length
  };
}
