import { describe, expect, it } from "vitest";
import { enforceComfortLocomotionSuite } from "@/lib/comfortLocomotionSuite";

describe("comfort locomotion suite", () => {
  it("enforces teleport/snap-turn/vignette comfort-safe movement modes", async () => {
    const result = await enforceComfortLocomotionSuite({ selectedModes: ["teleport", "smooth_move"], comfortPolicyAccepted: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.enforcedModes).toEqual(["teleport"]);
    expect(result.enforced).toBe(true);
  });
});
