import { describe, expect, it } from "vitest";
import { evaluateFoveatedRenderingSupport } from "@/lib/foveatedRenderingSupport";

describe("foveated rendering support", () => {
  it("requires capability gating and quality validation", async () => {
    const result = await evaluateFoveatedRenderingSupport({
      deviceCapabilities: ["eye_tracking", "hand_tracking"],
      peripheralQualityScore: 0.84,
      fallbackPathAvailable: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.foveatedReady).toBe(true);
    expect(result.capabilityGated).toBe(true);
  });
});
