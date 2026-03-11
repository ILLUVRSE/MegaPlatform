import { describe, expect, it } from "vitest";
import { consolidateInstitutionalMemoryV2 } from "@/lib/institutionalMemoryConsolidationV2";

describe("institutional memory consolidation v2", () => {
  it("feeds planning and policy recommendation flows", async () => {
    const result = await consolidateInstitutionalMemoryV2({
      memories: [
        { patternId: "p1", module: "feed", improvementScore: 0.8, reusable: true },
        { patternId: "p1", module: "watch", improvementScore: 0.7, reusable: true },
        { patternId: "p2", module: "party", improvementScore: 0.5, reusable: true }
      ]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.planningInputs.length).toBeGreaterThan(0);
    expect(result.policyRecommendations.some((entry) => entry.patternId === "p1")).toBe(true);
  });
});
