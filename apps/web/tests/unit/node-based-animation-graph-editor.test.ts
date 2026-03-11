import { describe, expect, it } from "vitest";
import { evaluateNodeBasedAnimationGraphEditor } from "@/lib/nodeBasedAnimationGraphEditor";

describe("node-based animation graph editor", () => {
  it("serializes to shared blend/state runtime contracts", async () => {
    const result = await evaluateNodeBasedAnimationGraphEditor({
      nodeCount: 120,
      hasBlendContract: true,
      hasStateContract: true,
      serializationVersion: "v2"
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.editorReady).toBe(true);
    expect(result.contractsSerialized).toBe(true);
  });
});
