import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  maxPreferenceSkew: z.number().min(0).max(1),
  minimumDiversityScore: z.number().min(0).max(1),
  maxManipulationRisk: z.number().min(0).max(1),
  blockSensitiveTargeting: z.boolean(),
  protectedAttributes: z.array(z.string().min(1)).min(1)
});

const requestSchema = z.object({
  candidateScores: z.record(z.string(), z.number().min(0).max(1)).refine((scores) => Object.keys(scores).length > 0),
  diversityScore: z.number().min(0).max(1),
  manipulationRisk: z.number().min(0).max(1),
  targeting: z.object({
    usesSensitiveAttributes: z.boolean(),
    attributes: z.array(z.string().min(1))
  })
});

const defaultPolicy = {
  maxPreferenceSkew: 0.55,
  minimumDiversityScore: 0.35,
  maxManipulationRisk: 0.25,
  blockSensitiveTargeting: true,
  protectedAttributes: ["health", "politics", "religion", "financial_status"]
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
    const raw = await fs.readFile(path.join(root, "ops", "governance", "personalization-ethics-layer.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    if (!validated.success) return defaultPolicy;
    return validated.data;
  } catch {
    return defaultPolicy;
  }
}

function calculatePreferenceSkew(candidateScores: Record<string, number>) {
  const values = Object.values(candidateScores);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return max - min;
}

export async function evaluatePersonalizationEthics(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const root = await findRepoRoot();
  const policy = await loadPolicy(root);

  const preferenceSkew = calculatePreferenceSkew(parsed.data.candidateScores);
  const sensitiveAttributeHits = parsed.data.targeting.attributes.filter((attribute) =>
    policy.protectedAttributes.includes(attribute)
  );

  const blockers = [
    preferenceSkew > policy.maxPreferenceSkew ? "preference_skew_exceeded" : null,
    parsed.data.diversityScore < policy.minimumDiversityScore ? "diversity_below_minimum" : null,
    parsed.data.manipulationRisk > policy.maxManipulationRisk ? "manipulation_risk_exceeded" : null,
    policy.blockSensitiveTargeting && parsed.data.targeting.usesSensitiveAttributes && sensitiveAttributeHits.length > 0
      ? "sensitive_targeting_blocked"
      : null
  ].filter((value): value is string => Boolean(value));

  return {
    ok: true as const,
    allowed: blockers.length === 0,
    blockers,
    summary: {
      preferenceSkew,
      diversityScore: parsed.data.diversityScore,
      manipulationRisk: parsed.data.manipulationRisk,
      sensitiveAttributeHits
    }
  };
}
