import { describe, expect, it } from "vitest";
import { evaluateCrowdReactionAnimationSystems } from "@/lib/crowdReactionAnimationSystems";

describe("crowd reaction animation systems", () => {
  it("maintains fidelity while staying inside frame budgets", async () => {
    const result = await evaluateCrowdReactionAnimationSystems({
      fidelityScore: 0.88,
      gpuFrameCostMs: 6.9,
      cpuFrameCostMs: 4.8
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reactionSystemReady).toBe(true);
    expect(result.fidelityMet).toBe(true);
  });
});
