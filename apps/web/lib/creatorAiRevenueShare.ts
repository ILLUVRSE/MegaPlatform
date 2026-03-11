import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  minimumCreatorShare: z.number().min(0).max(1),
  maximumAgentShare: z.number().min(0).max(1),
  platformShare: z.number().min(0).max(1),
  requireAttributionWeights: z.boolean()
});

const requestSchema = z.object({
  grossRevenue: z.number().nonnegative(),
  creatorWeight: z.number().min(0).max(1),
  agentWeight: z.number().min(0).max(1),
  hasAttributionWeights: z.boolean()
});

const defaultPolicy = {
  minimumCreatorShare: 0.5,
  maximumAgentShare: 0.4,
  platformShare: 0.1,
  requireAttributionWeights: true
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "creator-ai-revenue-share-engine.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function calculateCreatorAiRevenueShare(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  if (policy.requireAttributionWeights && !parsed.data.hasAttributionWeights) {
    return { ok: false as const, reason: "missing_attribution_weights" };
  }

  const distributable = parsed.data.grossRevenue * (1 - policy.platformShare);
  const totalWeight = parsed.data.creatorWeight + parsed.data.agentWeight;
  const normalizedCreator = totalWeight === 0 ? 1 : parsed.data.creatorWeight / totalWeight;
  const normalizedAgent = totalWeight === 0 ? 0 : parsed.data.agentWeight / totalWeight;

  const creatorShare = Math.max(policy.minimumCreatorShare, normalizedCreator * (1 - policy.platformShare));
  const agentShare = Math.min(policy.maximumAgentShare, normalizedAgent * (1 - policy.platformShare));

  const creatorPayout = distributable * (creatorShare / (creatorShare + agentShare || 1));
  const agentPayout = distributable - creatorPayout;
  const platformPayout = parsed.data.grossRevenue - distributable;

  return {
    ok: true as const,
    split: {
      creatorPayout,
      agentPayout,
      platformPayout
    }
  };
}
