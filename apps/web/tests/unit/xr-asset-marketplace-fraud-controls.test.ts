import { describe, expect, it } from "vitest";
import { evaluateXrAssetMarketplaceFraudControls } from "@/lib/xrAssetMarketplaceFraudControls";

describe("xr asset marketplace fraud controls", () => {
  it("can throttle or halt high-risk asset transactions", async () => {
    const result = await evaluateXrAssetMarketplaceFraudControls({
      fraudRiskScore: 0.95,
      transactionsPerMinute: 9,
      deviceTrusted: true,
      identityConfidenceScore: 0.9
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.shouldHalt).toBe(true);
    expect(result.fraudControlAction).toBe("halt");
  });
});
