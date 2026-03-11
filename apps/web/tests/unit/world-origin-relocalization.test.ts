import { describe, expect, it } from "vitest";
import { evaluateWorldOriginRelocalization } from "@/lib/worldOriginRelocalization";

describe("world origin relocalization", () => {
  it("preserves user/world continuity under reconnect recovery", async () => {
    const result = await evaluateWorldOriginRelocalization({
      driftMeters: 0.18,
      reconnectRecoveryMs: 900,
      continuityScore: 0.94,
      hasCachedOrigin: true
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.continuityPreserved).toBe(true);
    expect(result.recoveryPath).toBe("cached_origin_rebind");
  });
});
