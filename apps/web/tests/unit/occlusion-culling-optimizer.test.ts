import { describe, expect, it } from "vitest";
import { evaluateOcclusionCullingOptimizer } from "@/lib/occlusionCullingOptimizer";

describe("occlusion culling optimizer", () => {
  it("reduces overdraw while preserving visibility correctness", async () => {
    const result = await evaluateOcclusionCullingOptimizer({
      overdrawReductionPercent: 24,
      visibilityMismatches: 0
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.cullingOptimized).toBe(true);
    expect(result.correctnessMet).toBe(true);
  });
});
