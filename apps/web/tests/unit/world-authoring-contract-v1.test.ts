import { describe, expect, it } from "vitest";
import { evaluateWorldAuthoringContractV1 } from "@/lib/worldAuthoringContractV1";

describe("world authoring contract v1", () => {
  it("validates scene composition and ownership", async () => {
    const result = await evaluateWorldAuthoringContractV1({
      sceneNodeCount: 4200,
      metadata: { worldId: "w-7", ownerId: "creator-17", theme: "neo_city" },
      ownershipConflicts: 0
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.contractValid).toBe(true);
    expect(result.compositionValid).toBe(true);
    expect(result.ownershipValid).toBe(true);
  });
});
