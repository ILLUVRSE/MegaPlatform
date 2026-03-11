import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  defaultOrder: z.array(z.string().min(1)).min(1),
  maxRollbackSteps: z.number().int().positive(),
  requireApprovalForClasses: z.array(z.string().min(1)),
  safeModeOnRollback: z.boolean()
});

const requestSchema = z.object({
  changes: z
    .array(
      z.object({
        changeId: z.string().min(1),
        changeClass: z.string().min(1),
        priority: z.number(),
        rollbackAction: z.string().min(1)
      })
    )
    .min(1)
});

const defaultPolicy = {
  defaultOrder: ["runtime", "config", "policy"],
  maxRollbackSteps: 20,
  requireApprovalForClasses: ["policy"],
  safeModeOnRollback: true
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "global-rollback-orchestrator.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

function classOrder(policy: z.infer<typeof policySchema>, changeClass: string) {
  const index = policy.defaultOrder.indexOf(changeClass);
  return index >= 0 ? index : policy.defaultOrder.length + 1;
}

export async function buildGlobalRollbackPlan(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const steps = parsed.data.changes
    .slice()
    .sort((left, right) => {
      const classDiff = classOrder(policy, left.changeClass) - classOrder(policy, right.changeClass);
      if (classDiff !== 0) return classDiff;
      return right.priority - left.priority || left.changeId.localeCompare(right.changeId);
    })
    .slice(0, policy.maxRollbackSteps)
    .map((change, index) => ({
      step: index + 1,
      changeId: change.changeId,
      changeClass: change.changeClass,
      action: change.rollbackAction,
      requiresApproval: policy.requireApprovalForClasses.includes(change.changeClass)
    }));

  return {
    ok: true as const,
    safeModeOnRollback: policy.safeModeOnRollback,
    stepCount: steps.length,
    steps
  };
}
