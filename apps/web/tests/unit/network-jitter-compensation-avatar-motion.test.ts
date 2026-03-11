import { describe, expect, it } from "vitest";
import { evaluateNetworkJitterCompensationAvatarMotion } from "@/lib/networkJitterCompensationAvatarMotion";

describe("network jitter compensation for avatar motion", () => {
  it("improves continuity without violating authority bounds", async () => {
    const result = await evaluateNetworkJitterCompensationAvatarMotion({
      continuityScore: 0.9,
      authorityDivergence: 0.02,
      compensationLatencyMs: 80
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.jitterCompensationReady).toBe(true);
    expect(result.authoritySafe).toBe(true);
  });
});
