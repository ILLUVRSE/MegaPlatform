import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({ minEvidenceWeight: z.number().min(0).max(1), maxObjectiveShift: z.number().min(0).max(1) });
const requestSchema = z.object({
  objectives: z.array(z.object({ id: z.string().min(1), weight: z.number().min(0).max(1) })).min(1),
  evidence: z.array(z.object({ objectiveId: z.string().min(1), signal: z.number().min(-1).max(1), confidence: z.number().min(0).max(1) })).min(1)
});
const fallback = { minEvidenceWeight: 0.55, maxObjectiveShift: 0.25 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "goal-evolution-engine.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evolveGoals(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const evidenceByObjective = new Map<string, { weighted: number; totalConfidence: number }>();
  for (const item of parsed.data.evidence) {
    if (item.confidence < policy.minEvidenceWeight) continue;
    const current = evidenceByObjective.get(item.objectiveId) ?? { weighted: 0, totalConfidence: 0 };
    current.weighted += item.signal * item.confidence;
    current.totalConfidence += item.confidence;
    evidenceByObjective.set(item.objectiveId, current);
  }

  const revisedObjectives = parsed.data.objectives.map((objective) => {
    const ev = evidenceByObjective.get(objective.id);
    if (!ev || ev.totalConfidence <= 0) {
      return { ...objective, revisedWeight: objective.weight, rationale: "insufficient_evidence" as const };
    }
    const shift = Math.max(-policy.maxObjectiveShift, Math.min(policy.maxObjectiveShift, ev.weighted / ev.totalConfidence));
    const revisedWeight = Math.max(0, Math.min(1, Number((objective.weight + shift).toFixed(4))));
    return {
      ...objective,
      revisedWeight,
      rationale: "evidence_adjusted" as const,
      evidenceSummary: Number((ev.weighted / ev.totalConfidence).toFixed(4))
    };
  });

  return { ok: true as const, revisedObjectives };
}
