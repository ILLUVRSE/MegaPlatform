import { describe, expect, it } from "vitest";
import { evaluateCharacterPerformanceSLOs } from "@/lib/characterPerformanceSLOs";

describe("character performance slos", () => {
  it("integrates SLO dashboard and breach reporting", async () => {
    const result = await evaluateCharacterPerformanceSLOs({ runtimeUptime: 0.992, droppedFrameRate: 0.02 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.slosMet).toBe(false);
    expect(result.alertRequired).toBe(true);
    expect(result.dashboardIntegrated).toBe(true);
    expect(result.breachReportingIntegrated).toBe(true);
    expect(result.breachSurfaces).toEqual(["character_dashboard", "incident_channel"]);
  });
});
