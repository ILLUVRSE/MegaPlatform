import { describe, expect, it } from "vitest";
import { evaluateDynamicResolutionGovernor } from "@/lib/dynamicResolutionGovernor";

describe("dynamic resolution governor", () => {
  it("keeps frame time inside control band via bounded scaling", async () => {
    const result = await evaluateDynamicResolutionGovernor({
      observedFrameTimeMs: 11.4,
      proposedResolutionScale: 0.85
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.resolutionGoverned).toBe(true);
    expect(result.frameTimeInBand).toBe(true);
  });
});
