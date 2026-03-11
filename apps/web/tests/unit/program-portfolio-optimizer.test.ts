import { describe, expect, it } from "vitest";
import { optimizeProgramPortfolio } from "@/lib/programPortfolioOptimizer";

describe("program portfolio optimizer", () => {
  it("returns score-ranked reprioritization with evidence", async () => {
    const result = await optimizeProgramPortfolio([
      {
        id: "p107-a",
        title: "governance dashboard",
        impactScore: 0.9,
        riskScore: 0.2,
        costScore: 0.3,
        impactEvidence: "ops KPI uplift",
        riskEvidence: "low migration scope",
        costEvidence: "2 sprint estimate"
      },
      {
        id: "p107-b",
        title: "experimental feed widget",
        impactScore: 0.6,
        riskScore: 0.5,
        costScore: 0.4,
        impactEvidence: "moderate conversion potential",
        riskEvidence: "policy uncertainty",
        costEvidence: "3 sprint estimate"
      }
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recommendations[0].id).toBe("p107-a");
    expect(result.recommendations[0].evidenceSummary.impact.length).toBeGreaterThan(0);
  });
});
