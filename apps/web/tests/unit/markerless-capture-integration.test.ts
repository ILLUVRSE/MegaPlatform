import { describe, expect, it } from "vitest";
import { evaluateMarkerlessCaptureIntegration } from "@/lib/markerlessCaptureIntegration";

describe("markerless capture integration", () => {
  it("normalizes markerless inputs and enforces quality thresholds", async () => {
    const result = await evaluateMarkerlessCaptureIntegration({ confidence: 0.92, noise: 0.05, normalizationProfile: "body_v1" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.normalized).toBe(true);
    expect(result.passesQuality).toBe(true);
    expect(result.integrated).toBe(true);
  });
});
