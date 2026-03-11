import { describe, expect, it } from "vitest";
import { evaluateMocapCleanupAndSmoothingToolkit } from "@/lib/mocapCleanupAndSmoothingToolkit";

describe("mocap cleanup and smoothing toolkit", () => {
  it("provides reusable cleanup operators with measurable diagnostics", async () => {
    const result = await evaluateMocapCleanupAndSmoothingToolkit({
      inputJitter: 0.2,
      outputJitter: 0.06,
      outputNoise: 0.05,
      operators: ["median_filter", "velocity_smooth"]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.cleanupEffective).toBe(true);
    expect(result.reusableOperators).toBe(2);
    expect(result.qualityDiagnostics.jitterImprovement).toBeGreaterThan(0.25);
  });
});
