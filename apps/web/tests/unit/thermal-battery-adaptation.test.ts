import { describe, expect, it } from "vitest";
import { evaluateThermalBatteryAdaptation } from "@/lib/thermalBatteryAdaptation";

describe("thermal battery adaptation", () => {
  it("prevents unsafe throttling regressions through adaptation policy", async () => {
    const result = await evaluateThermalBatteryAdaptation({
      thermalState: 2,
      batteryPercent: 22,
      adaptationPolicyApplied: true,
      unsafeThrottleRegressionDetected: false
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.adaptationReady).toBe(true);
    expect(result.throttlingRegressionPrevented).toBe(true);
  });
});
