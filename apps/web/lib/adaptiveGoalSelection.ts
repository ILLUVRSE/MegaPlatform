import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
import { buildEcosystemStateModel } from "@/lib/ecosystemStateModel";
import { buildTrustworthyAiOperationsScore } from "@/lib/trustworthyAiScore";

const policySchema = z.object({
  maxGoals: z.number().int().positive(),
  blockedWhenActionLimit: z.array(z.enum(["normal", "restricted", "halted"])),
  preferredDomains: z.array(z.string().min(1)).min(1)
});

const objectiveSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  metric: z.string().min(1),
  owner: z.string().min(1),
  domain: z.string().min(1)
});

type AdaptivePolicy = z.infer<typeof policySchema>;
type Objective = z.infer<typeof objectiveSchema>;

const defaultPolicy: AdaptivePolicy = {
  maxGoals: 3,
  blockedWhenActionLimit: ["halted"] as const,
  preferredDomains: ["reliability", "governance", "growth"]
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "adaptive-goal-selection.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

async function loadObjectives(root: string) {
  try {
    const raw = await fs.readFile(path.join(root, "ops", "governance", "objectives.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = z.array(objectiveSchema).safeParse(parsed);
    if (!validated.success) return [] as Objective[];
    return validated.data;
  } catch {
    return [] as Objective[];
  }
}

export async function selectAdaptiveGoals() {
  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  const objectives = await loadObjectives(root);
  const state = await buildEcosystemStateModel();
  const trust = await buildTrustworthyAiOperationsScore();

  if (policy.blockedWhenActionLimit.includes(trust.actionLimit as AdaptivePolicy["blockedWhenActionLimit"][number])) {
    return {
      ok: true as const,
      blocked: true,
      reason: `action_limit_${trust.actionLimit}`,
      goals: [],
      generatedAt: new Date().toISOString()
    };
  }

  const goals = objectives
    .filter((objective) => policy.preferredDomains.includes(objective.domain))
    .slice(0, policy.maxGoals)
    .map((objective, index) => ({
      rank: index + 1,
      objectiveId: objective.id,
      objectiveName: objective.name,
      domain: objective.domain,
      rationale: `selected for ${state.health.state} health state and ${trust.actionLimit} action limit`
    }));

  return {
    ok: true as const,
    blocked: false,
    goals,
    context: {
      healthState: state.health.state,
      actionLimit: trust.actionLimit
    },
    generatedAt: new Date().toISOString()
  };
}
