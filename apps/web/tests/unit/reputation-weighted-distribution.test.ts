import { describe, expect, it } from "vitest";
import { evaluateReputationWeightedDistribution } from "@/lib/reputationWeightedDistribution";

describe("reputation-weighted distribution", () => {
  it("throttles low-reputation creators", async () => {
    const result = await evaluateReputationWeightedDistribution({
      creatorId: "creator-158",
      reputation: 0.2,
      quality: 0.9
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.throttled).toBe(true);
  });

  it("boosts high-reputation creators", async () => {
    const result = await evaluateReputationWeightedDistribution({
      creatorId: "creator-158-good",
      reputation: 0.85,
      quality: 0.75
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.boosted).toBe(true);
  });
});
