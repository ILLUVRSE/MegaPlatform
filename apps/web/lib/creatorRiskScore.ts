import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  weights: z.object({
    quality: z.number().min(0).max(1),
    safety: z.number().min(0).max(1),
    fraud: z.number().min(0).max(1)
  }),
  highRiskThreshold: z.number().min(0).max(1),
  mediumRiskThreshold: z.number().min(0).max(1),
  maxAutoEscalation: z.enum(["none", "review", "throttle"])
});

const requestSchema = z.object({
  creatorId: z.string().min(1),
  qualityRisk: z.number().min(0).max(1),
  safetyRisk: z.number().min(0).max(1),
  fraudRisk: z.number().min(0).max(1)
});

const defaultPolicy = {
  weights: { quality: 0.3, safety: 0.4, fraud: 0.3 },
  highRiskThreshold: 0.75,
  mediumRiskThreshold: 0.5,
  maxAutoEscalation: "review"
} as const;

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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "creator-risk-score-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function computeCreatorRiskScore(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const score =
    parsed.data.qualityRisk * policy.weights.quality +
    parsed.data.safetyRisk * policy.weights.safety +
    parsed.data.fraudRisk * policy.weights.fraud;

  const tier = score >= policy.highRiskThreshold ? "high" : score >= policy.mediumRiskThreshold ? "medium" : "low";
  const action = tier === "high" ? "throttle" : tier === "medium" ? policy.maxAutoEscalation : "none";

  return { ok: true as const, score, tier, action };
}
