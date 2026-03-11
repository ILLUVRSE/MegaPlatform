import { describe, expect, it } from "vitest";
import { evaluateDeviceCapabilityMatrixXr } from "@/lib/deviceCapabilityMatrixXr";

describe("device capability matrix xr", () => {
  it("drives feature gating and fallbacks", async () => {
    const result = await evaluateDeviceCapabilityMatrixXr({
      deviceClass: "standalone_headset",
      availableCapabilities: ["stereo_render", "pose_tracking", "hands"],
      requestedFeatures: ["hand_tracking", "scene_mesh"]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.baselineSupported).toBe(true);
    expect(result.evaluatedFeatures.find((f) => f.feature === "hand_tracking")?.supported).toBe(true);
    expect(result.evaluatedFeatures.find((f) => f.feature === "scene_mesh")?.fallback).toBe("bounded-play-area");
  });
});
