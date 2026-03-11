import { describe, expect, it } from "vitest";
import { discoverUnknownUnknowns } from "@/lib/unknownUnknownDiscoveryLoop";

describe("unknown-unknown discovery loop", () => {
  it("generates latent risk/opportunity hypotheses from anomaly surfaces", async () => {
    const result = await discoverUnknownUnknowns({
      anomalySurfaces: [
        { id: "a1", score: 0.9, dimension: "retention", direction: "risk" },
        { id: "a2", score: 0.85, dimension: "creator_growth", direction: "opportunity" }
      ]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.hypotheses.length).toBe(2);
  });
});
