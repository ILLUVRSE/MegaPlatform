import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  narrativeScore: z.number().min(0).max(1),
  spatialScore: z.number().min(0).max(1),
  visualScore: z.number().min(0).max(1)
});

const policySchema = z.object({
  minimumNarrativeScore: z.number().min(0).max(1),
  minimumSpatialScore: z.number().min(0).max(1),
  minimumVisualScore: z.number().min(0).max(1)
});

const fallback = { minimumNarrativeScore: 0.8, minimumSpatialScore: 0.82, minimumVisualScore: 0.78 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "world-coherence-validator.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateWorldCoherenceValidator(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const narrativePass = parsed.data.narrativeScore >= policy.minimumNarrativeScore;
  const spatialPass = parsed.data.spatialScore >= policy.minimumSpatialScore;
  const visualPass = parsed.data.visualScore >= policy.minimumVisualScore;
  const diagnostics = [
    !narrativePass ? "narrative_coherence_below_threshold" : null,
    !spatialPass ? "spatial_coherence_below_threshold" : null,
    !visualPass ? "visual_coherence_below_threshold" : null
  ].filter((value): value is string => value !== null);

  return {
    ok: true as const,
    publishReady: narrativePass && spatialPass && visualPass,
    diagnostics
  };
}
