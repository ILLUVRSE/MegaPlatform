import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  minimumCoherenceScore: z.number().min(0).max(1),
  maxSequenceJump: z.number().int().nonnegative(),
  requiredContextLinks: z.array(z.string().min(1)).min(1),
  blockOnMissingCoreLink: z.boolean()
});

const requestSchema = z.object({
  arcId: z.string().min(1),
  sequence: z.array(
    z.object({
      itemId: z.string().min(1),
      position: z.number().int().nonnegative(),
      contextLinks: z.array(z.string().min(1))
    })
  ),
  transitions: z.array(
    z.object({
      from: z.number().int().nonnegative(),
      to: z.number().int().nonnegative()
    })
  )
});

const defaultPolicy = {
  minimumCoherenceScore: 0.7,
  maxSequenceJump: 2,
  requiredContextLinks: ["character", "timeline", "theme"],
  blockOnMissingCoreLink: true
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "narrative-coherence-scorer.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

export async function scoreNarrativeCoherence(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const maxJumpObserved = parsed.data.transitions.reduce((max, transition) => {
    const jump = Math.abs(transition.to - transition.from);
    return Math.max(max, jump);
  }, 0);

  const missingLinks = policy.requiredContextLinks.filter((link) =>
    parsed.data.sequence.some((item) => !item.contextLinks.includes(link))
  );

  const jumpPenalty = maxJumpObserved > policy.maxSequenceJump ? Math.min(0.4, (maxJumpObserved - policy.maxSequenceJump) * 0.1) : 0;
  const linkPenalty = missingLinks.length * 0.1;
  const coherenceScore = Math.max(0, 1 - jumpPenalty - linkPenalty);

  const gated =
    coherenceScore < policy.minimumCoherenceScore || (policy.blockOnMissingCoreLink && missingLinks.length > 0);

  return {
    ok: true as const,
    coherenceScore,
    gated,
    summary: {
      maxJumpObserved,
      missingLinks,
      minimumRequired: policy.minimumCoherenceScore
    }
  };
}
