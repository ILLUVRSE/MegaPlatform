import { describe, expect, it } from "vitest";
import { evaluateHzReadinessProgram } from "@/lib/hzReadinessProgram";

describe("90/120hz readiness program", () => {
  it("certifies designated refresh rates with stability criteria", async () => {
    const result = await evaluateHzReadinessProgram({
      certifiedRefreshRatesHz: [90, 120],
      stabilityScore: 0.97
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.highRefreshReady).toBe(true);
    expect(result.stabilityMet).toBe(true);
  });
});
