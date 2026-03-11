import { describe, expect, it } from "vitest";
import { evaluateEmotionToAnimationController } from "@/lib/emotionToAnimationController";

describe("emotion-to-animation controller", () => {
  it("produces coherent transitions with bounded intensity", async () => {
    const result = await evaluateEmotionToAnimationController({ emotionState: "joy", intensity: 0.6, transitionCoherence: 0.88 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.coherentTransition).toBe(true);
    expect(result.intensityBounded).toBe(true);
    expect(result.controllerReady).toBe(true);
  });
});
