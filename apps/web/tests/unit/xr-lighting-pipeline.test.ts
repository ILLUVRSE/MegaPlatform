import { describe, expect, it } from "vitest";
import { evaluateXrLightingPipeline } from "@/lib/xrLightingPipeline";

describe("xr lighting pipeline", () => {
  it("enforces quality tiers tied to device capabilities", async () => {
    const result = await evaluateXrLightingPipeline({
      deviceTier: "medium",
      dynamicLightCount: 5,
      supportsDynamicLighting: true,
      bakedLightingAvailable: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.qualityTierCompliant).toBe(true);
    expect(result.dynamicTierValid).toBe(true);
    expect(result.dynamicSupported).toBe(true);
  });
});
