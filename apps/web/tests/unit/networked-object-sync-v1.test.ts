import { describe, expect, it } from "vitest";
import { evaluateNetworkedObjectSyncV1 } from "@/lib/networkedObjectSyncV1";

describe("networked object sync v1", () => {
  it("enforces deterministic authority and conflict policy", async () => {
    const result = await evaluateNetworkedObjectSyncV1({
      objects: [
        { objectId: "o-1", stateVersion: 5, lastUpdateSkewMs: 80 },
        { objectId: "o-2", stateVersion: 4, lastUpdateSkewMs: 40 }
      ]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.deterministicSync).toBe(true);
    expect(result.resolvedObjects).toEqual(["o-1"]);
  });
});
