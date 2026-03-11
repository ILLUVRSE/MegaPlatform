import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  maxErrorRate: z.number().min(0).max(1),
  maxLatencyMs: z.number().int().positive(),
  requireRollbackPlan: z.boolean()
});

const inputSchema = z.object({
  module: z.string().min(1),
  errorRate: z.number().min(0).max(1),
  p95LatencyMs: z.number().nonnegative(),
  recentDeployId: z.string().min(1)
});

const defaultPolicy = {
  maxErrorRate: 0.05,
  maxLatencyMs: 2000,
  requireRollbackPlan: true
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

async function loadPolicy() {
  const root = await findRepoRoot();
  try {
    const raw = await fs.readFile(path.join(root, "ops", "governance", "self-healing-behaviors.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function evaluateSelfHealingActions(rawInput: unknown) {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: "invalid_input" };

  const policy = await loadPolicy();
  const breaches = [] as string[];
  if (parsed.data.errorRate > policy.maxErrorRate) breaches.push("error_rate");
  if (parsed.data.p95LatencyMs > policy.maxLatencyMs) breaches.push("p95_latency_ms");

  const actions = breaches.map((breach, index) => ({
    id: `${parsed.data.module}-heal-${index + 1}`,
    type: breach === "error_rate" ? "rollback" : "capacity_scale",
    rollbackSafe: true,
    requiresRollbackPlan: policy.requireRollbackPlan,
    targetDeployId: parsed.data.recentDeployId
  }));

  return {
    ok: true as const,
    module: parsed.data.module,
    breaches,
    actions,
    triggerHealing: actions.length > 0,
    evaluatedAt: new Date().toISOString()
  };
}
