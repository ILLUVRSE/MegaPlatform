import { describe, expect, it } from "vitest";
import { validateSceneGraphContractV1 } from "@/lib/sceneGraphContractV1";

describe("scene graph contract v1", () => {
  it("guards invalid state transitions", async () => {
    const result = await validateSceneGraphContractV1({
      nodeId: "node-1",
      ownerId: "owner-1",
      fromState: "paused",
      toState: "created"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.transitionAllowed).toBe(false);
    expect(result.valid).toBe(false);
  });
});
