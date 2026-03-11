import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
import { selectAdaptiveGoals } from "@/lib/adaptiveGoalSelection";

const contractSchema = z.object({
  requiredFields: z.array(z.string().min(1)).min(1),
  allowedHorizons: z.array(z.enum(["immediate", "quarter", "annual"])).min(1),
  maxObjectives: z.number().int().positive(),
  requirePolicyReference: z.boolean()
});

const intentSchema = z.object({
  intentId: z.string().min(1),
  objective: z.string().min(1),
  owner: z.string().min(1),
  horizon: z.enum(["immediate", "quarter", "annual"]),
  successMetric: z.string().min(1),
  policyReference: z.string().min(1).optional()
});

const defaultContract = {
  requiredFields: ["intentId", "objective", "owner", "horizon", "successMetric"],
  allowedHorizons: ["immediate", "quarter", "annual"] as const,
  maxObjectives: 5,
  requirePolicyReference: true
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

async function loadContract(root: string) {
  try {
    const raw = await fs.readFile(path.join(root, "ops", "governance", "strategic-intent-contract.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = contractSchema.safeParse(parsed);
    if (!validated.success) return defaultContract;
    return validated.data;
  } catch {
    return defaultContract;
  }
}

export async function validateStrategicIntent(rawIntent: unknown) {
  const parsed = intentSchema.safeParse(rawIntent);
  if (!parsed.success) return { ok: false as const, reason: "invalid_intent" };

  const root = await findRepoRoot();
  const contract = await loadContract(root);

  if (!contract.allowedHorizons.includes(parsed.data.horizon)) {
    return { ok: false as const, reason: "invalid_horizon" };
  }

  if (contract.requirePolicyReference && !parsed.data.policyReference) {
    return { ok: false as const, reason: "missing_policy_reference" };
  }

  const adaptive = await selectAdaptiveGoals();
  const recommendedObjectives = !adaptive.ok || adaptive.blocked ? [] : adaptive.goals.map((goal) => goal.objectiveName);

  return {
    ok: true as const,
    valid: true,
    intent: parsed.data,
    recommendedObjectives: recommendedObjectives.slice(0, contract.maxObjectives),
    contractVersion: "v1"
  };
}
