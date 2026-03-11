import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  minimumReputationForBoost: z.number().min(0).max(1),
  throttleBelowReputation: z.number().min(0).max(1),
  maxThrottleFactor: z.number().min(0).max(1),
  qualityWeight: z.number().min(0).max(1),
  reputationWeight: z.number().min(0).max(1)
});

const requestSchema = z.object({
  creatorId: z.string().min(1),
  reputation: z.number().min(0).max(1),
  quality: z.number().min(0).max(1)
});

const defaultPolicy = {
  minimumReputationForBoost: 0.7,
  throttleBelowReputation: 0.4,
  maxThrottleFactor: 0.8,
  qualityWeight: 0.5,
  reputationWeight: 0.5
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "reputation-weighted-distribution.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function evaluateReputationWeightedDistribution(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const baseScore = parsed.data.quality * policy.qualityWeight + parsed.data.reputation * policy.reputationWeight;
  const throttled = parsed.data.reputation < policy.throttleBelowReputation;
  const throttleFactor = throttled ? Math.min(policy.maxThrottleFactor, 1 - parsed.data.reputation) : 0;
  const boosted = parsed.data.reputation >= policy.minimumReputationForBoost;

  return {
    ok: true as const,
    score: baseScore,
    boosted,
    throttled,
    throttleFactor
  };
}
