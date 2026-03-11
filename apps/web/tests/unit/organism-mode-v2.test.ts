import { describe, expect, it } from "vitest";
import { evaluateOrganismModeV2 } from "@/lib/organismModeV2";

describe("organism mode v2", () => {
  it("adaptively tunes autonomy bounds by confidence and risk", async () => {
    const result = await evaluateOrganismModeV2({ confidence: 0.9, risk: 0.2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.adaptiveAutonomyBound).toBeGreaterThan(0.6);
  });
});
