import { describe, expect, it } from "vitest";
import { evaluateWorldCoherenceValidator } from "@/lib/worldCoherenceValidator";

describe("world coherence validator", () => {
  it("emits actionable diagnostics in publish checks", async () => {
    const result = await evaluateWorldCoherenceValidator({
      narrativeScore: 0.86,
      spatialScore: 0.88,
      visualScore: 0.81
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.publishReady).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });
});
