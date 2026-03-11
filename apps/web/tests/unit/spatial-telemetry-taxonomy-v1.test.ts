import { describe, expect, it } from "vitest";
import { validateXrContractV1 } from "@/lib/xrContractV1";
import { evaluateDeviceCapabilityMatrixXr } from "@/lib/deviceCapabilityMatrixXr";
import { restoreSpatialIdentityAnchors } from "@/lib/spatialIdentityAnchors";

describe("spatial telemetry taxonomy v1", () => {
  it("is adopted across at least three xr modules", async () => {
    const a = await validateXrContractV1({ requestedRuntime: "openxr", adapterVersion: "1.0", capabilities: ["pose_tracking", "frame_loop", "input_intents"], coreRoutesUsingContract: ["/xr/session/start", "/xr/session/state", "/xr/input/dispatch"] });
    const b = await evaluateDeviceCapabilityMatrixXr({ deviceClass: "standalone", availableCapabilities: ["stereo_render", "pose_tracking", "hands"], requestedFeatures: ["hand_tracking"] });
    const c = await restoreSpatialIdentityAnchors({ identityId: "u", worldId: "w", anchors: [] });

    expect(a.ok && b.ok && c.ok).toBe(true);
    if (!a.ok || !b.ok || !c.ok) return;
    expect(a.telemetryEvent?.taxonomyVersion).toBe("v1");
    expect(b.telemetryEvent?.taxonomyVersion).toBe("v1");
    expect(c.telemetryEvent?.taxonomyVersion).toBe("v1");
  });
});
