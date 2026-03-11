import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { restoreSpatialIdentityAnchors } from "@/lib/spatialIdentityAnchors";

function key(identityId: string, worldId: string, kind: string) {
  return createHash("sha256").update(`${identityId}:${worldId}:${kind}`).digest("hex").slice(0, 24);
}

describe("spatial identity anchors", () => {
  it("restores anchors with deterministic identity-to-anchor mapping", async () => {
    const result = await restoreSpatialIdentityAnchors({
      identityId: "u-1",
      worldId: "w-1",
      anchors: [
        { key: key("u-1", "w-1", "head"), kind: "head", stability: 0.95 },
        { key: key("u-1", "w-1", "left_hand"), kind: "left_hand", stability: 0.9 },
        { key: key("u-1", "w-1", "right_hand"), kind: "right_hand", stability: 0.89 }
      ]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.deterministicMapping).toBe(true);
    expect(result.restoreReliable).toBe(true);
  });
});
