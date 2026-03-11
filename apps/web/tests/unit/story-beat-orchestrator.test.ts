import { describe, expect, it } from "vitest";
import { evaluateStoryBeatOrchestrator } from "@/lib/storyBeatOrchestrator";

describe("story beat orchestrator", () => {
  it("applies policy-driven transitions with interruption recovery", async () => {
    const result = await evaluateStoryBeatOrchestrator({
      currentBeatId: "beat-intro",
      nextBeatId: "beat-climax",
      transitionPolicyApplied: true,
      interruptionRecovered: true,
      recoveryDurationMs: 900
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.orchestrationReady).toBe(true);
    expect(result.policyDriven).toBe(true);
    expect(result.recoveryMet).toBe(true);
  });
});
