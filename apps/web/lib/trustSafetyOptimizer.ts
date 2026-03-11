import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  maxSafetyRisk: z.number().min(0).max(1),
  minSafetyMargin: z.number().min(0),
  rejectUnsafeGainPatterns: z.boolean()
});

const candidateSchema = z.object({
  id: z.string().min(1),
  engagementGain: z.number(),
  safetyRisk: z.number().min(0).max(1)
});

const defaultPolicy = {
  maxSafetyRisk: 0.25,
  minSafetyMargin: 0.05,
  rejectUnsafeGainPatterns: true
};

export async function loadTrustSafetyPolicy() {
  const fullPath = path.join(process.cwd(), "ops", "governance", "trust-safety-optimizer.json");
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = JSON.parse(raw);
    const result = policySchema.safeParse(parsed);
    if (!result.success) return defaultPolicy;
    return result.data;
  } catch {
    return defaultPolicy;
  }
}

export async function optimizeTrustSafety(candidates: unknown) {
  const policy = await loadTrustSafetyPolicy();
  const parsed = z.array(candidateSchema).safeParse(candidates);
  if (!parsed.success) return { policy, accepted: [], rejected: [] };

  const accepted: Array<z.infer<typeof candidateSchema>> = [];
  const rejected: Array<z.infer<typeof candidateSchema> & { reason: "unsafe_gain_pattern" | "safety_risk_exceeds_threshold" }> = [];
  for (const candidate of parsed.data) {
    const unsafeGainPattern =
      candidate.engagementGain > 0 &&
      candidate.safetyRisk > policy.maxSafetyRisk + policy.minSafetyMargin &&
      policy.rejectUnsafeGainPatterns;

    if (unsafeGainPattern || candidate.safetyRisk > policy.maxSafetyRisk) {
      rejected.push({
        ...candidate,
        reason: unsafeGainPattern ? "unsafe_gain_pattern" : "safety_risk_exceeds_threshold"
      });
      continue;
    }

    accepted.push(candidate);
  }

  return {
    policy,
    accepted,
    rejected,
    generatedAt: new Date().toISOString()
  };
}
