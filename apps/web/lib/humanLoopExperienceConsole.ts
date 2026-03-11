import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  outputPath: z.string().min(1),
  highImpactActions: z.array(z.string().min(1)).min(1),
  requireApprovalForHighImpact: z.boolean(),
  maxOpenActions: z.number().int().positive()
});

const actionSchema = z.object({
  actionId: z.string().min(1),
  actionType: z.string().min(1),
  status: z.enum(["proposed", "approved", "overridden"]),
  operator: z.string().min(1).optional(),
  reason: z.string().min(1).optional()
});

const defaultPolicy = {
  outputPath: "ops/logs/human-in-the-loop-experience-console.json",
  highImpactActions: ["ranking_override", "exposure_suppression", "friction_force"],
  requireApprovalForHighImpact: true,
  maxOpenActions: 500
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "human-in-the-loop-experience-console.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

async function readStore(root: string, outputPath: string) {
  try {
    const raw = await fs.readFile(path.join(root, outputPath), "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.actions)) return { actions: [] as unknown[] };
    return parsed;
  } catch {
    return { actions: [] as unknown[] };
  }
}

export async function listExperienceActions() {
  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  return readStore(root, policy.outputPath);
}

export async function upsertExperienceAction(rawAction: unknown) {
  const parsed = actionSchema.safeParse(rawAction);
  if (!parsed.success) return { ok: false as const, reason: "invalid_action" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  const store = await readStore(root, policy.outputPath);

  const isHighImpact = policy.highImpactActions.includes(parsed.data.actionType);
  if (isHighImpact && policy.requireApprovalForHighImpact && parsed.data.status === "proposed") {
    if (store.actions.filter((entry) => (entry as { status?: string }).status === "proposed").length >= policy.maxOpenActions) {
      return { ok: false as const, reason: "max_open_actions_exceeded" };
    }
  }

  const nextActions = [
    parsed.data,
    ...store.actions.filter((entry) => (entry as { actionId?: string }).actionId !== parsed.data.actionId)
  ];

  const normalized = {
    actions: nextActions
  };

  await fs.writeFile(path.join(root, policy.outputPath), `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");

  return {
    ok: true as const,
    action: parsed.data,
    requiresHumanApproval: isHighImpact && parsed.data.status === "proposed"
  };
}
