import { describe, expect, it } from "vitest";
import { evaluateThreeDAccessibilityBaselineV1 } from "@/lib/threeDAccessibilityBaselineV1";

describe("3d accessibility baseline v1", () => {
  it("passes baseline accessibility checks for core immersive journeys", async () => {
    const result = await evaluateThreeDAccessibilityBaselineV1({
      captionsEnabled: true,
      highContrastUiEnabled: true,
      seatedModeSupported: true,
      oneHandedInputSupported: true,
      assistiveAudioCuesEnabled: true,
      baselineScore: 0.98
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.baselinePassing).toBe(true);
    expect(result.scoreCompliant).toBe(true);
  });
});
