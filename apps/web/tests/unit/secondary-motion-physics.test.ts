import { describe, expect, it } from "vitest";
import { evaluateSecondaryMotionPhysics } from "@/lib/secondaryMotionPhysics";

describe("secondary motion physics", () => {
  it("runs within defined performance budgets", async () => {
    const result = await evaluateSecondaryMotionPhysics({ cpuCostMs: 1.8, simulatedNodes: 80, frameBudgetPercent: 10 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.withinPerformanceBudget).toBe(true);
  });
});
