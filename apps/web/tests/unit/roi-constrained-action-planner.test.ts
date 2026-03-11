import { describe, expect, it } from "vitest";
import { evaluateRoiConstrainedAction } from "@/lib/roiConstrainedActionPlanner";

describe("roi constrained action planner", () => {
  it("blocks actions when modeled roi is below threshold", async () => {
    const result = await evaluateRoiConstrainedAction({
      actionId: "act-163",
      expectedReturnCents: 1000,
      expectedCostCents: 1200,
      confidence: 0.8,
      paybackDays: 20
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.approved).toBe(false);
    expect(result.blockers).toContain("roi_below_minimum");
  });
});
