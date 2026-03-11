import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  proposalScoreThreshold: z.number().min(0).max(1),
  minimumSignalCount: z.number().int().min(1),
  requiredHorizonDays: z.number().int().min(1)
});

const signalSchema = z.object({
  policyId: z.string().min(1),
  horizonDays: z.number().int().min(1),
  performanceDelta: z.number().min(-1).max(1),
  verified: z.boolean()
});

const requestSchema = z.object({ signals: z.array(signalSchema).min(1) });

const fallbackPolicy = {
  proposalScoreThreshold: 0.65,
  minimumSignalCount: 3,
  requiredHorizonDays: 90
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), "ops", "governance", "meta-learning-policy-optimizer.json"),
      "utf-8"
    );
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallbackPolicy;
  } catch {
    return fallbackPolicy;
  }
}

export async function optimizeMetaLearningPolicy(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) {
    return { ok: false as const, reason: "invalid_request" };
  }

  const policy = await loadPolicy();
  const byPolicy = new Map<string, { count: number; scoreSum: number }>();

  for (const signal of parsed.data.signals) {
    if (!signal.verified || signal.horizonDays < policy.requiredHorizonDays) continue;
    const current = byPolicy.get(signal.policyId) ?? { count: 0, scoreSum: 0 };
    current.count += 1;
    current.scoreSum += (signal.performanceDelta + 1) / 2;
    byPolicy.set(signal.policyId, current);
  }

  const proposals = Array.from(byPolicy.entries())
    .map(([policyId, stats]) => ({
      policyId,
      supportingSignals: stats.count,
      proposedScore: Number((stats.scoreSum / stats.count).toFixed(4))
    }))
    .filter(
      (proposal) =>
        proposal.supportingSignals >= policy.minimumSignalCount &&
        proposal.proposedScore >= policy.proposalScoreThreshold
    )
    .sort((a, b) => b.proposedScore - a.proposedScore || a.policyId.localeCompare(b.policyId));

  return {
    ok: true as const,
    proposals,
    verification: {
      requiredHorizonDays: policy.requiredHorizonDays,
      minimumSignalCount: policy.minimumSignalCount
    }
  };
}
