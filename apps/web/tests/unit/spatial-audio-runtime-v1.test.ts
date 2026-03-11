import { describe, expect, it } from "vitest";
import { evaluateSpatialAudioRuntimeV1 } from "@/lib/spatialAudioRuntimeV1";

describe("spatial audio runtime v1", () => {
  it("supports directional and distance-aware audio checks", async () => {
    const result = await evaluateSpatialAudioRuntimeV1({
      deviceTier: "medium",
      activeSpatialVoices: 24,
      hrtfSourceCount: 12,
      directionalAudioEnabled: true,
      distanceAttenuationEnabled: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.runtimeReady).toBe(true);
    expect(result.directionalAudioEnabled).toBe(true);
    expect(result.attenuationCompliant).toBe(true);
  });
});
