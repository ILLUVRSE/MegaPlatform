import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const compilerPolicySchema = z.object({
  version: z.string().min(1),
  allowedEffects: z.array(z.enum(["allow", "deny", "require_approval"])).min(1),
  requiredFields: z.array(z.string().min(1)).min(1),
  defaultEffect: z.enum(["allow", "deny", "require_approval"]),
  outputPath: z.string().min(1)
});

const sourceRuleSchema = z.object({
  id: z.string().min(1),
  scope: z.string().min(1),
  effect: z.enum(["allow", "deny", "require_approval"]),
  priority: z.number().int(),
  conditions: z.record(z.string(), z.array(z.string().min(1))).default({})
});

const defaultPolicy = {
  version: "1.0.0",
  allowedEffects: ["allow", "deny", "require_approval"] as const,
  requiredFields: ["id", "scope", "effect", "priority"],
  defaultEffect: "deny" as const,
  outputPath: "ops/logs/autonomy-policy-compiled.json"
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

async function loadCompilerPolicy(root: string) {
  try {
    const raw = await fs.readFile(path.join(root, "ops", "governance", "autonomy-policy-compiler.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = compilerPolicySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

async function loadSourceRules(root: string) {
  try {
    const raw = await fs.readFile(path.join(root, "ops", "governance", "autonomy-policies.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = z.array(sourceRuleSchema).safeParse(parsed);
    if (!validated.success) {
      return {
        ok: false as const,
        errors: validated.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`),
        rules: []
      };
    }

    return {
      ok: true as const,
      errors: [] as string[],
      rules: validated.data
    };
  } catch (error) {
    return {
      ok: false as const,
      errors: [error instanceof Error ? error.message : String(error)],
      rules: []
    };
  }
}

function compileRule(rule: z.infer<typeof sourceRuleSchema>) {
  const sortedConditionKeys = Object.keys(rule.conditions).sort();
  const normalizedConditions = sortedConditionKeys.map((key) => ({
    key,
    values: [...rule.conditions[key]].sort()
  }));

  return {
    id: rule.id,
    scope: rule.scope,
    effect: rule.effect,
    priority: rule.priority,
    normalizedConditions,
    executableKey: `${rule.scope}:${rule.effect}:${rule.priority}:${rule.id}`
  };
}

export async function compileAutonomyPolicies() {
  const root = await findRepoRoot();
  const policy = await loadCompilerPolicy(root);
  const source = await loadSourceRules(root);

  if (!source.ok) {
    return {
      ok: false as const,
      errors: source.errors
    };
  }

  const disallowedEffect = source.rules.find((rule) => !policy.allowedEffects.includes(rule.effect));
  if (disallowedEffect) {
    return {
      ok: false as const,
      errors: [`rule '${disallowedEffect.id}' uses effect '${disallowedEffect.effect}' not allowed by compiler policy`]
    };
  }

  const missingFieldRule = source.rules.find(
    (rule) => policy.requiredFields.some((field) => !Object.prototype.hasOwnProperty.call(rule, field))
  );
  if (missingFieldRule) {
    return {
      ok: false as const,
      errors: [`rule '${missingFieldRule.id}' missing one or more required fields`]
    };
  }

  const compiledRules = source.rules
    .map(compileRule)
    .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));

  const artifact = {
    compilerVersion: policy.version,
    defaultEffect: policy.defaultEffect,
    ruleCount: compiledRules.length,
    compiledRules
  };

  await fs.writeFile(path.join(root, policy.outputPath), `${JSON.stringify(artifact, null, 2)}\n`, "utf-8");

  return {
    ok: true as const,
    artifact
  };
}

export async function readCompiledAutonomyPolicies() {
  const root = await findRepoRoot();
  const policy = await loadCompilerPolicy(root);

  try {
    const raw = await fs.readFile(path.join(root, policy.outputPath), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
