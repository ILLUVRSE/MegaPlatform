import { describe, expect, it } from "vitest";
import { evaluatePersonalizationEthics } from "@/lib/personalizationEthics";

describe("personalization ethics layer", () => {
  it("allows policy-safe personalization decisions", async () => {
    const result = await evaluatePersonalizationEthics({
      candidateScores: { a: 0.62, b: 0.48, c: 0.39 },
      diversityScore: 0.41,
      manipulationRisk: 0.15,
      targeting: {
        usesSensitiveAttributes: false,
        attributes: []
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.allowed).toBe(true);
  });

  it("blocks personalization decisions that breach ethics constraints", async () => {
    const result = await evaluatePersonalizationEthics({
      candidateScores: { a: 0.95, b: 0.25, c: 0.2 },
      diversityScore: 0.2,
      manipulationRisk: 0.35,
      targeting: {
        usesSensitiveAttributes: true,
        attributes: ["health"]
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.allowed).toBe(false);
    expect(result.blockers).toContain("preference_skew_exceeded");
    expect(result.blockers).toContain("diversity_below_minimum");
    expect(result.blockers).toContain("manipulation_risk_exceeded");
    expect(result.blockers).toContain("sensitive_targeting_blocked");
  });
});
