import { describe, expect, it } from "vitest";
import { calculateLivePerformanceRevenueShare } from "@/lib/livePerformanceRevenueShareEngine";

describe("live performance revenue share engine", () => {
  it("produces deterministic explainable and auditable revenue shares", async () => {
    const result = await calculateLivePerformanceRevenueShare({
      grossRevenue: 1000,
      creatorSharePercent: 50,
      platformSharePercent: 30,
      collaboratorSharePercent: 20,
      explanationProvided: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.revenueShareCompliant).toBe(true);
    expect(result.allocations.creatorAmount).toBe(500);
  });
});
