import { describe, expect, it } from "vitest";
import { evaluateYouthSafeXrMode } from "@/lib/youthSafeXrMode";

describe("youth-safe xr mode", () => {
  it("enforces mandatory child/youth-safe defaults", async () => {
    const result = await evaluateYouthSafeXrMode({
      ageSegmentClassified: true,
      safeLocomotionProfileEnabled: true,
      voiceChatModerationEnabled: true,
      guardianControlsEnabled: true,
      safetyDefaultsScore: 0.96
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.youthSafeModeCompliant).toBe(true);
    expect(result.safetyDefaultsCompliant).toBe(true);
  });
});
