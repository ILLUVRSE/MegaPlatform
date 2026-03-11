import { describe, expect, it } from "vitest";
import { buildMultiModalNarrativeArc } from "@/lib/multiModalNarrative";

describe("multi-modal narrative layer", () => {
  it("builds coherent trackable arc across multiple formats", async () => {
    const result = await buildMultiModalNarrativeArc({
      narrativeId: "arc-114",
      theme: "city under neon storms",
      assets: [
        { id: "a1", format: "text", title: "opening log" },
        { id: "a2", format: "video", title: "storm sequence" },
        { id: "a3", format: "game", title: "escape mission" }
      ]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.steps.length).toBe(3);
    expect(result.trackable).toBe(true);
  });
});
