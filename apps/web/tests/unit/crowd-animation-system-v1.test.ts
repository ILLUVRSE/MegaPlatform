import { describe, expect, it } from "vitest";
import { evaluateCrowdAnimationSystemV1 } from "@/lib/crowdAnimationSystemV1";

describe("crowd animation system v1", () => {
  it("handles density targets within frame budgets", async () => {
    const result = await evaluateCrowdAnimationSystemV1({ densityPerCell: 32, frameTimeMs: 15.2, behaviorLodDowngrade: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.runtimeReady).toBe(true);
    expect(result.densityTargetMet).toBe(true);
    expect(result.frameBudgetMet).toBe(true);
  });
});
