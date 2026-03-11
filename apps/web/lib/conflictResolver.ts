import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  priorityOrder: z.array(z.string().min(1)).min(1),
  denyBeatsAllow: z.boolean(),
  requiredTraceFields: z.array(z.string().min(1)).min(1)
});

const proposalSchema = z.object({
  agent: z.string().min(1),
  objective: z.string().min(1),
  action: z.string().min(1),
  effect: z.enum(["allow", "deny"]),
  rationale: z.string().min(1)
});

const defaultPolicy = {
  priorityOrder: ["safety", "ops", "governance", "product", "growth"],
  denyBeatsAllow: true,
  requiredTraceFields: ["winner", "losers", "reason"]
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "inter-agent-conflicts.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

function rankAgent(agent: string, order: string[]) {
  const index = order.indexOf(agent);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export async function resolveAgentConflict(rawProposals: unknown) {
  const parsed = z.array(proposalSchema).min(2).safeParse(rawProposals);
  if (!parsed.success) return { ok: false as const, reason: "invalid_proposals" };

  const policy = await loadPolicy();
  const proposals = parsed.data;
  const ranked = [...proposals].sort((a, b) => rankAgent(a.agent, policy.priorityOrder) - rankAgent(b.agent, policy.priorityOrder));

  const denyCandidate = policy.denyBeatsAllow ? ranked.find((proposal) => proposal.effect === "deny") : null;
  const winner = denyCandidate ?? ranked[0];
  const losers = ranked.filter((proposal) => proposal !== winner);

  const reason = denyCandidate
    ? `deny precedence by ${denyCandidate.agent}`
    : `priority order winner ${winner.agent}`;

  return {
    ok: true as const,
    winner,
    losers,
    trace: {
      reason,
      priorityOrder: policy.priorityOrder,
      denyBeatsAllow: policy.denyBeatsAllow
    },
    resolvedAt: new Date().toISOString()
  };
}
