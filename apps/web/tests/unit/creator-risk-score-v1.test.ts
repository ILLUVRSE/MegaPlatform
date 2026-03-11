import { describe, expect, it } from "vitest";
import { computeCreatorRiskScore } from "@/lib/creatorRiskScore";

describe("creator risk score v1", () => {
  it("assigns high risk tier for high combined risk inputs", async () => {
    const result = await computeCreatorRiskScore({
      creatorId: "creator-157",
      qualityRisk: 0.8,
      safetyRisk: 0.9,
      fraudRisk: 0.7
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tier).toBe("high");
  });
});
