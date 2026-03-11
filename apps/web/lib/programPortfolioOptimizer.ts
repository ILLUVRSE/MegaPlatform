import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  weights: z.object({
    impact: z.number().min(0),
    risk: z.number().min(0),
    cost: z.number().min(0)
  }),
  minEvidenceFields: z.array(z.string().min(1)).min(1)
});

const initiativeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  impactScore: z.number().min(0).max(1),
  riskScore: z.number().min(0).max(1),
  costScore: z.number().min(0).max(1),
  impactEvidence: z.string().min(1),
  riskEvidence: z.string().min(1),
  costEvidence: z.string().min(1)
});

const defaultPolicy = {
  weights: {
    impact: 0.5,
    risk: 0.3,
    cost: 0.2
  },
  minEvidenceFields: ["impactEvidence", "riskEvidence", "costEvidence"]
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "program-portfolio-optimizer.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function optimizeProgramPortfolio(rawInitiatives: unknown) {
  const parsed = z.array(initiativeSchema).min(1).safeParse(rawInitiatives);
  if (!parsed.success) return { ok: false as const, reason: "invalid_initiatives" };

  const policy = await loadPolicy();
  const ranked = parsed.data
    .map((initiative) => {
      const score =
        initiative.impactScore * policy.weights.impact -
        initiative.riskScore * policy.weights.risk -
        initiative.costScore * policy.weights.cost;
      return {
        ...initiative,
        score,
        evidenceSummary: {
          impact: initiative.impactEvidence,
          risk: initiative.riskEvidence,
          cost: initiative.costEvidence
        }
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    ok: true as const,
    policy,
    recommendations: ranked.map((initiative, index) => ({
      ...initiative,
      recommendedPriority: index + 1
    })),
    generatedAt: new Date().toISOString()
  };
}
