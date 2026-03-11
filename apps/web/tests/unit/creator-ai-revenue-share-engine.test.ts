import { describe, expect, it } from "vitest";
import { calculateCreatorAiRevenueShare } from "@/lib/creatorAiRevenueShare";

describe("creator-ai revenue share engine", () => {
  it("computes deterministic payout split", async () => {
    const result = await calculateCreatorAiRevenueShare({
      grossRevenue: 1000,
      creatorWeight: 0.7,
      agentWeight: 0.3,
      hasAttributionWeights: true
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.split.platformPayout).toBe(100);
  });
});
