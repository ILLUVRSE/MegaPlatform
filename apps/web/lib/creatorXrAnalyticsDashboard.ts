import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  trackedMetricCount: z.number().int().nonnegative(),
  actionableInsightsAvailable: z.boolean(),
  outputAttributionLinked: z.boolean()
});

const policySchema = z.object({
  minimumTrackedMetrics: z.number().int().positive(),
  requireActionableInsights: z.boolean(),
  requireOutputAttribution: z.boolean()
});

const fallback = {
  minimumTrackedMetrics: 4,
  requireActionableInsights: true,
  requireOutputAttribution: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "creator-xr-analytics-dashboard.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateCreatorXrAnalyticsDashboard(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const metricCoverageMet = parsed.data.trackedMetricCount >= policy.minimumTrackedMetrics;
  const actionableMet = !policy.requireActionableInsights || parsed.data.actionableInsightsAvailable;
  const attributionMet = !policy.requireOutputAttribution || parsed.data.outputAttributionLinked;

  return {
    ok: true as const,
    dashboardReady: metricCoverageMet && actionableMet && attributionMet,
    metricCoverageMet,
    actionableMet,
    attributionMet
  };
}
