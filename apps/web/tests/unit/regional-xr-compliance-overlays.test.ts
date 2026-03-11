import { describe, expect, it } from "vitest";
import { evaluateRegionalXrComplianceOverlay } from "@/lib/regionalXrComplianceOverlays";

describe("regional xr compliance overlays", () => {
  it("applies region overlays through compliance policy engine", async () => {
    const result = await evaluateRegionalXrComplianceOverlay({
      regionCode: "de",
      contentRatingLabel: "mature",
      biometricsEnabled: false,
      recordingEnabled: false,
      geoAnchoringEnabled: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.overlayCompliant).toBe(true);
    expect(result.overlayActions.disableRecording).toBe(true);
  });
});
