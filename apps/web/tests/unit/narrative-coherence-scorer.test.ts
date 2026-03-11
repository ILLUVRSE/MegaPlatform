import { describe, expect, it } from "vitest";
import { scoreNarrativeCoherence } from "@/lib/narrativeCoherenceScorer";

describe("narrative coherence scorer", () => {
  it("keeps coherent sequences ungated", async () => {
    const result = await scoreNarrativeCoherence({
      arcId: "arc-145",
      sequence: [
        { itemId: "a", position: 1, contextLinks: ["character", "timeline", "theme"] },
        { itemId: "b", position: 2, contextLinks: ["character", "timeline", "theme"] }
      ],
      transitions: [{ from: 1, to: 2 }]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.gated).toBe(false);
  });

  it("gates incoherent sequences", async () => {
    const result = await scoreNarrativeCoherence({
      arcId: "arc-145-bad",
      sequence: [
        { itemId: "a", position: 1, contextLinks: ["character"] },
        { itemId: "b", position: 6, contextLinks: ["character"] }
      ],
      transitions: [{ from: 1, to: 6 }]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.gated).toBe(true);
    expect(result.summary.missingLinks).toContain("timeline");
  });
});
