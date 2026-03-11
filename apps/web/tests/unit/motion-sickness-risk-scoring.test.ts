import { describe, expect, it } from "vitest";
import { scoreMotionSicknessRisk } from "@/lib/motionSicknessRiskScoring";

describe("motion sickness risk scoring", () => {
  it("triggers mitigation prompt and safe-mode defaults for high-risk sessions", async () => {
    const result = await scoreMotionSicknessRisk({
      vectionIntensity: 0.95,
      angularVelocityDps: 340,
      frameTimeVarianceMs: 18,
      sessionDurationMinutes: 55,
      mitigationPromptShown: true,
      safeModeEnabled: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.highRiskSession).toBe(true);
    expect(result.mitigationPromptRequired).toBe(true);
  });
});
