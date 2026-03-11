import { describe, expect, it } from "vitest";
import { calibrateAutonomyConfidenceV2 } from "@/lib/autonomyConfidenceCalibrationV2";

describe("autonomy confidence calibration v2", () => {
  it("tracks calibration metrics and uses them for execution gating", async () => {
    const result = await calibrateAutonomyConfidenceV2({
      outcomes: [
        { confidence: 0.8, realizedSuccess: 0.7 },
        { confidence: 0.6, realizedSuccess: 0.65 },
        { confidence: 0.75, realizedSuccess: 0.7 }
      ]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.metrics.samples).toBe(3);
    expect(["allow", "constrain"]).toContain(result.executionGate);
  });
});
