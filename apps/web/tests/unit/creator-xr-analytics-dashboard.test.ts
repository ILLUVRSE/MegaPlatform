import { describe, expect, it } from "vitest";
import { evaluateCreatorXrAnalyticsDashboard } from "@/lib/creatorXrAnalyticsDashboard";

describe("creator xr analytics dashboard", () => {
  it("exposes actionable metrics tied to creator outputs", async () => {
    const result = await evaluateCreatorXrAnalyticsDashboard({
      trackedMetricCount: 6,
      actionableInsightsAvailable: true,
      outputAttributionLinked: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dashboardReady).toBe(true);
    expect(result.metricCoverageMet).toBe(true);
  });
});
