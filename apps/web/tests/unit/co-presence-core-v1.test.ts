import { describe, expect, it } from "vitest";
import { evaluateCoPresenceCoreV1 } from "@/lib/coPresenceCoreV1";

describe("co-presence core v1", () => {
  it("keeps pose/state sync stable with reconnect and conflict resolution", async () => {
    const result = await evaluateCoPresenceCoreV1({
      participants: [
        { id: "p1", poseDriftMeters: 0.1, stateVersion: 3, reconnecting: false },
        { id: "p2", poseDriftMeters: 0.2, stateVersion: 4, reconnecting: true }
      ],
      elapsedSinceDisconnectMs: 5000
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.poseStateSyncStable).toBe(true);
    expect(result.conflictResolvedParticipants).toEqual(["p2"]);
  });
});
