import { describe, expect, it } from "vitest";
import { evaluateVirtualProductionControlRoom } from "@/lib/virtualProductionControlRoom";

describe("virtual production control room", () => {
  it("covers cues, camera, effects, and moderation with auditability", async () => {
    const result = await evaluateVirtualProductionControlRoom({
      exposedControlSurfaces: ["cues", "camera", "effects", "moderation"],
      pendingCueDepth: 8,
      moderationStateLinked: true,
      stateAuditTrailEnabled: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.controlRoomReady).toBe(true);
    expect(result.moderationCoverageMet).toBe(true);
  });
});
