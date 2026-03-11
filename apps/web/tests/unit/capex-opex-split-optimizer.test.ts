import { describe, expect, it } from "vitest";
import { optimizeCapexOpexSplit } from "@/lib/capexOpexSplitOptimizer";

describe("capex opex split optimizer", () => {
  it("returns policy-driven execution plan splits", async () => {
    const result = await optimizeCapexOpexSplit({
      planId: "plan-165",
      workloads: [
        { workloadId: "w1", type: "steady_render" },
        { workloadId: "w2", type: "burst_recommendation" }
      ]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.workloads.map((w) => w.executionMode)).toEqual(["capex", "opex"]);
  });
});
