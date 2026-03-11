import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({ maxCandidates: z.number().int().min(1), impactWeight: z.number().min(0), riskWeight: z.number().min(0), costWeight: z.number().min(0) });
const requestSchema = z.object({
  initiatives: z.array(z.object({ id: z.string().min(1), quarter: z.string().min(1), impact: z.number().min(0).max(1), risk: z.number().min(0).max(1), cost: z.number().min(0).max(1) })).min(1)
});
const fallback = { maxCandidates: 5, impactWeight: 0.5, riskWeight: 0.3, costWeight: 0.2 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "multi-quarter-roadmap-synthesizer.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch { return fallback; }
}

export async function synthesizeMultiQuarterRoadmap(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const candidates = parsed.data.initiatives
    .map((initiative) => ({
      ...initiative,
      priorityScore: Number((initiative.impact * policy.impactWeight - initiative.risk * policy.riskWeight - initiative.cost * policy.costWeight).toFixed(4)),
      evidence: { impact: initiative.impact, risk: initiative.risk, cost: initiative.cost }
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore || a.id.localeCompare(b.id))
    .slice(0, policy.maxCandidates);

  return { ok: true as const, candidates };
}
