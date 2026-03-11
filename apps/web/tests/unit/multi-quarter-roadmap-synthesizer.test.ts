import { describe, expect, it } from "vitest";
import { synthesizeMultiQuarterRoadmap } from "@/lib/multiQuarterRoadmapSynthesizer";

describe("multi-quarter roadmap synthesizer", () => {
  it("returns prioritized roadmap candidates with risk/cost/impact evidence", async () => {
    const result = await synthesizeMultiQuarterRoadmap({
      initiatives: [
        { id: "i1", quarter: "Q1", impact: 0.9, risk: 0.2, cost: 0.3 },
        { id: "i2", quarter: "Q2", impact: 0.6, risk: 0.4, cost: 0.5 }
      ]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.candidates[0]?.evidence).toBeDefined();
  });
});
