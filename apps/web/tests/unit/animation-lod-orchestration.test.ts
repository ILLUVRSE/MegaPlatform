import { describe, expect, it } from "vitest";
import { evaluateAnimationLodOrchestration } from "@/lib/animationLodOrchestration";

describe("animation lod orchestration", () => {
  it("preserves quality while reducing animation runtime cost", async () => {
    const result = await evaluateAnimationLodOrchestration({
      qualityRetentionScore: 0.84,
      animationRuntimeCostMs: 3.9,
      distanceTieringEnabled: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lodOrchestrated).toBe(true);
    expect(result.runtimeCostReduced).toBe(true);
  });
});
