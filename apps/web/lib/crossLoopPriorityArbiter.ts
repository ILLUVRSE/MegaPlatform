import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
import { solveUnifiedConstraints } from "@/lib/unifiedConstraintSolver";

const policySchema = z.object({
  loopWeights: z.record(z.string(), z.number().positive()),
  maxSelected: z.number().int().positive(),
  blockedDecisions: z.array(z.enum(["allow", "deny", "require_approval"]))
});

const candidateSchema = z.object({
  id: z.string().min(1),
  loop: z.string().min(1),
  domain: z.string().min(1),
  basePriority: z.number(),
  attributes: z.record(z.string(), z.string()).default({})
});

type CrossLoopPolicy = z.infer<typeof policySchema>;

const defaultPolicy: CrossLoopPolicy = {
  loopWeights: {
    safety: 1.5,
    reliability: 1.2,
    growth: 0.9,
    economy: 1.0
  },
  maxSelected: 5,
  blockedDecisions: ["deny"] as const
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "cross-loop-priority-arbiter.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function arbitrateCrossLoopPriorities(rawCandidates: unknown) {
  const parsed = z.array(candidateSchema).safeParse(rawCandidates);
  if (!parsed.success) return { ok: false as const, reason: "invalid_candidates" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const evaluated = await Promise.all(
    parsed.data.map(async (candidate) => {
      const constraint = await solveUnifiedConstraints({
        domain: candidate.domain,
        attributes: candidate.attributes
      });

      if (!constraint.ok) {
        return {
          ...candidate,
          decision: "deny" as const,
          blocked: true,
          score: Number.NEGATIVE_INFINITY,
          reason: "constraint_failure"
        };
      }

      const weight = policy.loopWeights[candidate.loop] ?? 1;
      const score = candidate.basePriority * weight;
      const blocked = policy.blockedDecisions.includes(constraint.decision);

      return {
        ...candidate,
        decision: constraint.decision,
        blocked,
        score,
        reason: blocked ? `blocked_${constraint.decision}` : "eligible"
      };
    })
  );

  const selected = evaluated
    .filter((candidate) => !candidate.blocked)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, policy.maxSelected);

  return {
    ok: true as const,
    selected,
    evaluatedCount: evaluated.length,
    blockedCount: evaluated.filter((candidate) => candidate.blocked).length
  };
}
