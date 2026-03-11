import { describe, expect, it } from "vitest";
import { evaluateVolumetricEffectsFramework } from "@/lib/volumetricEffectsFramework";

describe("volumetric effects framework", () => {
  it("exposes reusable presets with performance caps", async () => {
    const result = await evaluateVolumetricEffectsFramework({
      preset: "mist",
      estimatedGpuCostMs: 2.4,
      particleDensity: 0.5
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.frameworkCompliant).toBe(true);
    expect(result.presetAllowed).toBe(true);
    expect(result.gpuCapMet).toBe(true);
  });
});
