import { describe, expect, it } from "vitest";
import { buildCoordinationPlan } from "@/lib/crossModuleCoordinator";

describe("cross module coordinator", () => {
  it("ranks proposals by ecosystem-balanced score", async () => {
    const result = await buildCoordinationPlan([
      {
        module: "watch",
        objectiveId: "watch_engagement",
        expectedImpact: 0.2,
        ecosystemImpact: 0.3,
        safetyRisk: 0.1
      },
      {
        module: "feed",
        objectiveId: "global_safety",
        expectedImpact: 0.1,
        ecosystemImpact: 0.4,
        safetyRisk: 0.05
      }
    ]);
    expect(result.plan.length).toBe(2);
    expect(result.plan[0].score).toBeGreaterThanOrEqual(result.plan[1].score);
  });
});
