import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({ minimumAnomalyScore: z.number().min(0).max(1), maxHypotheses: z.number().int().min(1) });
const requestSchema = z.object({
  anomalySurfaces: z.array(z.object({ id: z.string().min(1), score: z.number().min(0).max(1), dimension: z.string().min(1), direction: z.enum(["risk", "opportunity"]) })).min(1)
});
const fallback = { minimumAnomalyScore: 0.7, maxHypotheses: 8 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "unknown-unknown-discovery-loop.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch { return fallback; }
}

export async function discoverUnknownUnknowns(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const hypotheses = parsed.data.anomalySurfaces
    .filter((surface) => surface.score >= policy.minimumAnomalyScore)
    .map((surface) => ({
      hypothesisId: `${surface.direction}_${surface.id}`,
      type: surface.direction,
      dimension: surface.dimension,
      supportingAnomalyScore: surface.score,
      hypothesis: `${surface.direction === "risk" ? "Latent risk" : "Latent opportunity"} detected on ${surface.dimension}`
    }))
    .sort((a, b) => b.supportingAnomalyScore - a.supportingAnomalyScore || a.hypothesisId.localeCompare(b.hypothesisId))
    .slice(0, policy.maxHypotheses);

  return { ok: true as const, hypotheses };
}
