import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  grossRevenue: z.number().nonnegative(),
  creatorSharePercent: z.number().min(0).max(100),
  platformSharePercent: z.number().min(0).max(100),
  collaboratorSharePercent: z.number().min(0).max(100),
  explanationProvided: z.boolean()
});

const policySchema = z.object({
  maximumRoundingDrift: z.number().nonnegative(),
  requireFullAllocation: z.boolean(),
  minimumCreatorSharePercent: z.number().min(0).max(100),
  maximumPlatformSharePercent: z.number().min(0).max(100),
  requireAllocationExplanation: z.boolean()
});

const fallback = {
  maximumRoundingDrift: 0.01,
  requireFullAllocation: true,
  minimumCreatorSharePercent: 30,
  maximumPlatformSharePercent: 40,
  requireAllocationExplanation: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), "ops", "governance", "live-performance-revenue-share-engine.json"),
      "utf-8"
    );
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

function roundToCents(amount: number) {
  return Math.round(amount * 100) / 100;
}

export async function calculateLivePerformanceRevenueShare(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const totalPercent =
    parsed.data.creatorSharePercent + parsed.data.platformSharePercent + parsed.data.collaboratorSharePercent;
  const creatorAmount = roundToCents((parsed.data.grossRevenue * parsed.data.creatorSharePercent) / 100);
  const platformAmount = roundToCents((parsed.data.grossRevenue * parsed.data.platformSharePercent) / 100);
  const collaboratorAmount = roundToCents((parsed.data.grossRevenue * parsed.data.collaboratorSharePercent) / 100);
  const allocatedTotal = roundToCents(creatorAmount + platformAmount + collaboratorAmount);
  const drift = Math.abs(roundToCents(parsed.data.grossRevenue - allocatedTotal));

  const fullAllocationCompliant = !policy.requireFullAllocation || Math.abs(totalPercent - 100) < 0.001;
  const creatorShareCompliant = parsed.data.creatorSharePercent >= policy.minimumCreatorSharePercent;
  const platformShareCompliant = parsed.data.platformSharePercent <= policy.maximumPlatformSharePercent;
  const driftCompliant = drift <= policy.maximumRoundingDrift;
  const explanationCompliant = !policy.requireAllocationExplanation || parsed.data.explanationProvided;

  return {
    ok: true as const,
    revenueShareCompliant:
      fullAllocationCompliant &&
      creatorShareCompliant &&
      platformShareCompliant &&
      driftCompliant &&
      explanationCompliant,
    allocations: {
      creatorAmount,
      platformAmount,
      collaboratorAmount,
      allocatedTotal,
      drift
    },
    fullAllocationCompliant,
    creatorShareCompliant,
    platformShareCompliant,
    driftCompliant,
    explanationCompliant
  };
}
