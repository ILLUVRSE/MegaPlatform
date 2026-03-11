import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  outputPath: z.string().min(1),
  quorum: z.number().int().positive(),
  approvalThreshold: z.number().min(0).max(1),
  maxOpenProposals: z.number().int().positive()
});

const proposalSchema = z.object({
  proposalId: z.string().min(1),
  title: z.string().min(1),
  proposerId: z.string().min(1),
  policyArea: z.string().min(1)
});

const voteSchema = z.object({
  proposalId: z.string().min(1),
  voterId: z.string().min(1),
  vote: z.enum(["yes", "no"])
});

const defaultPolicy = {
  outputPath: "ops/logs/creator-governance-council.json",
  quorum: 2,
  approvalThreshold: 0.6,
  maxOpenProposals: 200
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "creator-governance-council-api.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

async function readStore(root: string, outputPath: string) {
  try {
    const raw = await fs.readFile(path.join(root, outputPath), "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.proposals)) return { proposals: [] as unknown[] };
    return parsed;
  } catch {
    return { proposals: [] as unknown[] };
  }
}

function finalizeProposal(proposal: {
  votes: Array<{ vote: "yes" | "no" }>;
  status: "open" | "approved" | "rejected";
}, policy: z.infer<typeof policySchema>) {
  if (proposal.status !== "open") return proposal;

  const totalVotes = proposal.votes.length;
  if (totalVotes < policy.quorum) return proposal;

  const yesVotes = proposal.votes.filter((vote) => vote.vote === "yes").length;
  const yesRatio = totalVotes === 0 ? 0 : yesVotes / totalVotes;

  if (yesRatio >= policy.approvalThreshold) return { ...proposal, status: "approved" as const };
  return { ...proposal, status: "rejected" as const };
}

export async function submitCouncilProposal(rawProposal: unknown) {
  const parsed = proposalSchema.safeParse(rawProposal);
  if (!parsed.success) return { ok: false as const, reason: "invalid_proposal" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  const store = await readStore(root, policy.outputPath);

  const openCount = store.proposals.filter((proposal) => (proposal as { status?: string }).status === "open").length;
  if (openCount >= policy.maxOpenProposals) {
    return { ok: false as const, reason: "max_open_proposals_reached" };
  }

  const nextProposal = {
    ...parsed.data,
    status: "open" as const,
    votes: [] as Array<{ voterId: string; vote: "yes" | "no" }>
  };

  const nextProposals = [
    nextProposal,
    ...store.proposals.filter((proposal) => (proposal as { proposalId?: string }).proposalId !== parsed.data.proposalId)
  ];

  await fs.writeFile(path.join(root, policy.outputPath), `${JSON.stringify({ proposals: nextProposals }, null, 2)}\n`, "utf-8");
  return { ok: true as const, proposal: nextProposal };
}

export async function voteCouncilProposal(rawVote: unknown) {
  const parsed = voteSchema.safeParse(rawVote);
  if (!parsed.success) return { ok: false as const, reason: "invalid_vote" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  const store = await readStore(root, policy.outputPath);

  let updated = false;
  const nextProposals = store.proposals.map((proposal) => {
    const value = proposal as {
      proposalId: string;
      votes: Array<{ voterId: string; vote: "yes" | "no" }>;
      status: "open" | "approved" | "rejected";
    };

    if (value.proposalId !== parsed.data.proposalId) return proposal;

    updated = true;
    const nextVotes = [
      { voterId: parsed.data.voterId, vote: parsed.data.vote },
      ...value.votes.filter((vote) => vote.voterId !== parsed.data.voterId)
    ];

    return finalizeProposal({ ...value, votes: nextVotes }, policy);
  });

  if (!updated) return { ok: false as const, reason: "proposal_not_found" };

  await fs.writeFile(path.join(root, policy.outputPath), `${JSON.stringify({ proposals: nextProposals }, null, 2)}\n`, "utf-8");

  const proposal = nextProposals.find((entry) => (entry as { proposalId?: string }).proposalId === parsed.data.proposalId);
  return { ok: true as const, proposal };
}

export async function listCouncilProposals() {
  const root = await findRepoRoot();
  const policy = await loadPolicy(root);
  return readStore(root, policy.outputPath);
}
