import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  overdrawReductionPercent: z.number().min(0).max(100),
  visibilityMismatches: z.number().int().nonnegative()
});

const policySchema = z.object({
  minimumOverdrawReductionPercent: z.number().min(0).max(100),
  maxVisibilityMismatches: z.number().int().nonnegative()
});

const fallback = {
  minimumOverdrawReductionPercent: 18,
  maxVisibilityMismatches: 0
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "occlusion-culling-optimizer.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateOcclusionCullingOptimizer(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const overdrawReduced = parsed.data.overdrawReductionPercent >= policy.minimumOverdrawReductionPercent;
  const correctnessMet = parsed.data.visibilityMismatches <= policy.maxVisibilityMismatches;

  return {
    ok: true as const,
    cullingOptimized: overdrawReduced && correctnessMet,
    overdrawReduced,
    correctnessMet
  };
}
