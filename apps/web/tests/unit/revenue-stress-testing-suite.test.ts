import { describe, expect, it } from "vitest";
import { runRevenueStressTest } from "@/lib/revenueStressTestingSuite";

describe("revenue stress testing suite", () => {
  it("quantifies policy breach points under shock scenarios", async () => {
    const result = await runRevenueStressTest({
      baselineRevenueCents: 10000,
      scenarios: [
        { name: "demand_drop", projectedRevenueCents: 6000 },
        { name: "refund_spike", projectedRevenueCents: 4000 },
        { name: "ad_market_decline", projectedRevenueCents: 7000 }
      ]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.breachPoints).toContain("refund_spike");
  });
});
