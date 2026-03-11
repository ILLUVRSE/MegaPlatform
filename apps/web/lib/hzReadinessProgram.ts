import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  certifiedRefreshRatesHz: z.array(z.number().int().positive()),
  stabilityScore: z.number().min(0).max(1)
});

const policySchema = z.object({
  designatedRefreshRatesHz: z.array(z.number().int().positive()).min(1),
  minimumStabilityScore: z.number().min(0).max(1)
});

const fallback = {
  designatedRefreshRatesHz: [90, 120],
  minimumStabilityScore: 0.95
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "90-120hz-readiness-program.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateHzReadinessProgram(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const missingDesignatedRates = policy.designatedRefreshRatesHz.filter((rate) => !parsed.data.certifiedRefreshRatesHz.includes(rate));
  const stabilityMet = parsed.data.stabilityScore >= policy.minimumStabilityScore;

  return {
    ok: true as const,
    highRefreshReady: missingDesignatedRates.length === 0 && stabilityMet,
    missingDesignatedRates,
    stabilityMet
  };
}
