import { describe, expect, it } from "vitest";
import { evaluateBlendTreeRuntimeV1 } from "@/lib/blendTreeRuntimeV1";

describe("blend tree runtime v1", () => {
  it("drives at least two character classes", async () => {
    const result = await evaluateBlendTreeRuntimeV1({
      characterClasses: ["npc", "player"],
      nodes: [
        { nodeId: "base", depth: 0, blendMode: "linear" },
        { nodeId: "overlay", depth: 1, blendMode: "additive" }
      ]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.runtimeReady).toBe(true);
    expect(result.drivesCharacterClasses).toBeGreaterThanOrEqual(2);
  });
});
