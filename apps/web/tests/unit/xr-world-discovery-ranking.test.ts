import { describe, expect, it } from "vitest";
import { evaluateXrWorldDiscoveryRanking } from "@/lib/xrWorldDiscoveryRanking";

describe("xr world discovery and ranking", () => {
  it("enforces configurable and governance-bounded ranking policy", async () => {
    const result = await evaluateXrWorldDiscoveryRanking({
      relevanceScore: 0.9,
      qualityScore: 0.85,
      safetyScore: 0.92,
      freshnessScore: 0.7,
      promotionBoost: 0.1
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rankingEligible).toBe(true);
    expect(result.rankingScore).toBeGreaterThan(0.8);
  });
});
