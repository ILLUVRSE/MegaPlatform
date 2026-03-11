import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  minimumIntentConfidence: z.number().min(0).max(1),
  intentModuleMap: z.record(z.string(), z.array(z.string().min(1)).min(1)),
  fallbackSequence: z.array(z.string().min(1)).min(1),
  maxHighRiskRecommendations: z.number().int().positive()
});

const requestSchema = z.object({
  explicitIntents: z.array(z.string().min(1)),
  inferredIntents: z.array(
    z.object({
      intent: z.string().min(1),
      confidence: z.number().min(0).max(1)
    })
  ),
  availableModules: z.array(z.string().min(1)).min(1),
  riskLevel: z.enum(["low", "medium", "high"])
});

const defaultPolicy = {
  minimumIntentConfidence: 0.55,
  intentModuleMap: {
    relax: ["watch", "shorts"],
    create: ["studio"],
    socialize: ["party", "watch"],
    compete: ["games", "gamegrid"],
    learn: ["news", "watch"]
  },
  fallbackSequence: ["watch", "shorts", "home"],
  maxHighRiskRecommendations: 1
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "intent-aware-session-planner.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function planIntentAwareSession(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  const available = new Set(parsed.data.availableModules);

  const inferredAboveThreshold = parsed.data.inferredIntents.filter(
    (intent) => intent.confidence >= policy.minimumIntentConfidence
  );

  const rankedIntents = [...parsed.data.explicitIntents.map((intent) => ({ intent, confidence: 1 })), ...inferredAboveThreshold]
    .sort((left, right) => right.confidence - left.confidence)
    .map((entry) => entry.intent);

  const recommended = rankedIntents
    .flatMap((intent) => policy.intentModuleMap[intent] ?? [])
    .filter((module, index, list) => list.indexOf(module) === index)
    .filter((module) => available.has(module));

  const fallback = policy.fallbackSequence.filter((module) => available.has(module));
  const basePlan = recommended.length > 0 ? recommended : fallback;

  const cappedPlan =
    parsed.data.riskLevel === "high" ? basePlan.slice(0, policy.maxHighRiskRecommendations) : basePlan;

  return {
    ok: true as const,
    usedFallback: recommended.length === 0,
    plan: cappedPlan,
    selectedIntents: rankedIntents.slice(0, 3)
  };
}
