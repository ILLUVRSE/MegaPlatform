import { describe, expect, it } from "vitest";
import { evaluateCostAwarePlan } from "@/lib/costAwareOptimizer";

describe("cost aware optimizer", () => {
  it("blocks plans exceeding configured budget caps", async () => {
    const result = await evaluateCostAwarePlan([
      { id: "a1", type: "render_boost", estimatedCostCents: 3000 },
      { id: "a2", type: "cache_warm", estimatedCostCents: 2500 }
    ]);
    expect(result.pass).toBe(false);
    expect(result.blockers.length).toBeGreaterThan(0);
  });
});
