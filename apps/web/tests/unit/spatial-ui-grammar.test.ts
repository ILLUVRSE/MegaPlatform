import { describe, expect, it } from "vitest";
import { evaluateSpatialUiGrammar } from "@/lib/spatialUiGrammar";

describe("spatial ui grammar", () => {
  it("validates shared 3d ui primitives and tokens", async () => {
    const result = await evaluateSpatialUiGrammar({ surfaceId: "main_menu", depthMeters: 1.2, tokens: ["panel", "focus_ring", "affordance"] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.valid).toBe(true);
  });
});
