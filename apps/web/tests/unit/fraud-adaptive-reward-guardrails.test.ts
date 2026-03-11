import { describe, expect, it } from "vitest";
import { evaluateFraudAdaptiveReward } from "@/lib/fraudAdaptiveRewardGuardrails";

describe("fraud adaptive reward guardrails", () => {
  it("halts rewards when fraud indicators are critical", async () => {
    const result = await evaluateFraudAdaptiveReward({ rewardPoolId: "pool-168", requestedRewardCents: 1000, fraudIndex: 0.9 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.decision).toBe("halt");
    expect(result.approvedRewardCents).toBe(0);
  });
});
