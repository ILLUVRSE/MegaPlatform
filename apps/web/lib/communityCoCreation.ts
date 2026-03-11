import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  requiredContributorTypes: z.array(z.enum(["user", "agent"])).min(1),
  allowedModerationStates: z.array(z.enum(["pending", "approved", "rejected"])).min(1),
  requireProvenance: z.boolean()
});

const workflowSchema = z.object({
  workflowId: z.string().min(1),
  moderationState: z.enum(["pending", "approved", "rejected"]),
  contributions: z.array(
    z.object({
      contributorType: z.enum(["user", "agent"]),
      contributorId: z.string().min(1),
      contentRef: z.string().min(1),
      provenanceRef: z.string().min(1).optional()
    })
  )
});

type CoCreationPolicy = z.infer<typeof policySchema>;

const defaultPolicy: CoCreationPolicy = {
  requiredContributorTypes: ["user", "agent"],
  allowedModerationStates: ["pending", "approved", "rejected"],
  requireProvenance: true
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "community-co-creation.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function validateCoCreationWorkflow(rawInput: unknown) {
  const parsed = workflowSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: "invalid_input" };

  const policy = await loadPolicy();
  if (!policy.allowedModerationStates.includes(parsed.data.moderationState)) {
    return { ok: false as const, reason: "invalid_moderation_state" };
  }

  const types = new Set(parsed.data.contributions.map((item) => item.contributorType));
  const missingTypes = policy.requiredContributorTypes.filter((type) => !types.has(type));
  if (missingTypes.length > 0) {
    return { ok: false as const, reason: "missing_contributor_types", missingTypes };
  }

  if (policy.requireProvenance && parsed.data.contributions.some((item) => !item.provenanceRef)) {
    return { ok: false as const, reason: "missing_provenance" };
  }

  return {
    ok: true as const,
    workflowId: parsed.data.workflowId,
    moderationState: parsed.data.moderationState,
    contributionCount: parsed.data.contributions.length,
    validatedAt: new Date().toISOString()
  };
}
