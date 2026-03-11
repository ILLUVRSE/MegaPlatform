import { describe, expect, it } from "vitest";
import { generateComfortMotionRiskLabel } from "@/lib/comfortMotionRiskLabels";

describe("comfort and motion risk labels", () => {
  it("generates pre-session risk labels for session entry disclosure", async () => {
    const result = await generateComfortMotionRiskLabel({
      motionIntensity: 0.8,
      accelerationPeaksPerMinute: 22,
      priorDiscomfortIncidents: 2,
      comfortAidsEnabled: false
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.riskLabel).toBe("high");
    expect(result.preSessionDisclosureRequired).toBe(true);
    expect(result.requireAcknowledgementBeforeEntry).toBe(true);
  });
});
