import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  minimumPatternSupport: z.number().int().min(1),
  maxPatterns: z.number().int().min(1),
  recommendationThreshold: z.number().min(0).max(1)
});

const requestSchema = z.object({
  memories: z
    .array(
      z.object({
        patternId: z.string().min(1),
        module: z.string().min(1),
        improvementScore: z.number().min(0).max(1),
        reusable: z.boolean()
      })
    )
    .min(1)
});

const fallback = {
  minimumPatternSupport: 2,
  maxPatterns: 6,
  recommendationThreshold: 0.6
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "institutional-memory-consolidation-v2.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function consolidateInstitutionalMemoryV2(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const grouped = new Map<string, { support: number; totalScore: number; modules: Set<string> }>();
  for (const memory of parsed.data.memories) {
    if (!memory.reusable) continue;
    const current = grouped.get(memory.patternId) ?? { support: 0, totalScore: 0, modules: new Set<string>() };
    current.support += 1;
    current.totalScore += memory.improvementScore;
    current.modules.add(memory.module);
    grouped.set(memory.patternId, current);
  }

  const patterns = Array.from(grouped.entries())
    .map(([patternId, stats]) => ({
      patternId,
      support: stats.support,
      averageScore: Number((stats.totalScore / stats.support).toFixed(4)),
      modules: Array.from(stats.modules).sort()
    }))
    .filter((row) => row.support >= policy.minimumPatternSupport)
    .sort((a, b) => b.averageScore - a.averageScore || a.patternId.localeCompare(b.patternId))
    .slice(0, policy.maxPatterns);

  const policyRecommendations = patterns
    .filter((pattern) => pattern.averageScore >= policy.recommendationThreshold)
    .map((pattern) => ({ patternId: pattern.patternId, recommendation: "promote_to_policy" as const }));

  return {
    ok: true as const,
    patterns,
    planningInputs: patterns.map((pattern) => ({ patternId: pattern.patternId, modules: pattern.modules })),
    policyRecommendations
  };
}
