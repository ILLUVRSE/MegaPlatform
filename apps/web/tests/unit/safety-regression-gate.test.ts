import { describe, expect, it } from "vitest";
import { evaluateSafetyRegressionGate } from "@/lib/safetyRegressionGate";

describe("safety regression gate", () => {
  it("fails when metrics exceed configured thresholds", async () => {
    const result = await evaluateSafetyRegressionGate({
      toxicity_rate: 0.03,
      policy_bypass_rate: 0.002,
      high_severity_incident_rate: 0.001
    });

    expect(result.ok).toBe(false);
    expect(result.failedMetrics.some((metric) => metric.metric === "toxicity_rate")).toBe(true);
  });
});
