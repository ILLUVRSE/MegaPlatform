import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  maxSecretsPerTask: z.number().int().positive(),
  maxTtlMinutes: z.number().int().positive(),
  allowedScopes: z.array(z.string().min(1)).min(1),
  denyWildcardScopes: z.boolean()
});

const requestSchema = z.object({
  taskId: z.string().min(1),
  secrets: z
    .array(
      z.object({
        name: z.string().min(1),
        scope: z.string().min(1),
        ttlMinutes: z.number().int().positive()
      })
    )
    .min(1)
});

const defaultPolicy = {
  maxSecretsPerTask: 3,
  maxTtlMinutes: 60,
  allowedScopes: ["read:telemetry", "read:storage", "write:queue"],
  denyWildcardScopes: true
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "autonomous-secrets-minimization.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

function maskSecretName(name: string) {
  if (name.length <= 4) return "****";
  return `${name.slice(0, 2)}***${name.slice(-2)}`;
}

export async function evaluateSecretsMinimization(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const violations: string[] = [];
  if (parsed.data.secrets.length > policy.maxSecretsPerTask) {
    violations.push("secrets_per_task_exceeded");
  }

  const evaluated = parsed.data.secrets.map((secret) => {
    const wildcard = secret.scope.includes("*");
    const invalidScope = !policy.allowedScopes.includes(secret.scope) || (policy.denyWildcardScopes && wildcard);
    const invalidTtl = secret.ttlMinutes > policy.maxTtlMinutes;

    if (invalidScope) violations.push(`invalid_scope:${secret.name}`);
    if (invalidTtl) violations.push(`ttl_exceeded:${secret.name}`);

    return {
      name: maskSecretName(secret.name),
      scope: secret.scope,
      ttlMinutes: secret.ttlMinutes,
      allowed: !invalidScope && !invalidTtl
    };
  });

  return {
    ok: true as const,
    taskId: parsed.data.taskId,
    allowed: violations.length === 0,
    violations,
    secrets: evaluated
  };
}
