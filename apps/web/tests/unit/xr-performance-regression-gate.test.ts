import { describe, expect, it } from "vitest";
import { evaluateXrPerformanceRegressionGate } from "@/lib/xrPerformanceRegressionGate";

describe("xr performance regression gate", () => {
  it("enforces baseline thresholds in ci/release gating flow", async () => {
    const result = await evaluateXrPerformanceRegressionGate({
      gpuFrameTimeMs: 8.1,
      cpuFrameTimeMs: 5.2,
      stableFps: 92,
      ciGateEnabled: true,
      releaseBlockedOnFailure: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.regressionGatePassing).toBe(true);
    expect(result.ciEnforcementMet).toBe(true);
  });
});
