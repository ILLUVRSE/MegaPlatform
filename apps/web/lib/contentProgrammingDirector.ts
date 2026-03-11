import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  maxPlacementsPerPlan: z.number().int().positive(),
  allowedSurfaces: z.array(z.string().min(1)).min(1),
  requireSafetyReview: z.boolean()
});

const requestSchema = z.object({
  campaignId: z.string().min(1),
  contentId: z.string().min(1),
  targetSurfaces: z.array(z.string().min(1)).min(1),
  priority: z.enum(["low", "medium", "high"]).default("medium")
});

const defaultPolicy = {
  maxPlacementsPerPlan: 5,
  allowedSurfaces: ["home", "watch", "shorts", "games"],
  requireSafetyReview: true
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "content-programming-director.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function generateContentProgrammingPlan(rawInput: unknown) {
  const parsed = requestSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: "invalid_input" };

  const policy = await loadPolicy();
  const allowedTargets = parsed.data.targetSurfaces.filter((surface) => policy.allowedSurfaces.includes(surface));
  const placements = allowedTargets.slice(0, policy.maxPlacementsPerPlan).map((surface, index) => ({
    id: `${parsed.data.campaignId}-placement-${index + 1}`,
    surface,
    slot: index + 1,
    contentId: parsed.data.contentId,
    requiresSafetyReview: policy.requireSafetyReview,
    reason: `priority:${parsed.data.priority}`
  }));

  return {
    ok: true as const,
    campaignId: parsed.data.campaignId,
    placements,
    generatedAt: new Date().toISOString()
  };
}
