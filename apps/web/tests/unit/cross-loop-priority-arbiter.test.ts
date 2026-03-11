import { describe, expect, it } from "vitest";
import { arbitrateCrossLoopPriorities } from "@/lib/crossLoopPriorityArbiter";

describe("cross-loop priority arbiter", () => {
  it("selects highest weighted eligible candidates", async () => {
    const result = await arbitrateCrossLoopPriorities([
      {
        id: "c1",
        loop: "safety",
        domain: "ops",
        basePriority: 0.8,
        attributes: { riskLevel: "low" }
      },
      {
        id: "c2",
        loop: "growth",
        domain: "finance",
        basePriority: 0.7,
        attributes: { riskLevel: "high", costTier: "elevated" }
      }
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.evaluatedCount).toBe(2);
    expect(result.selected.every((candidate) => candidate.blocked === false)).toBe(true);
  });
});
