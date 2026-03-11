import { describe, expect, it } from "vitest";
import { simulateAutonomousStrategyV2 } from "@/lib/autonomousStrategySimulatorV2";

describe("autonomous strategy simulator v2", () => {
  it("scores policy-bounded strategy alternatives", async () => {
    const result = await simulateAutonomousStrategyV2({
      alternatives: [
        { id: "alt_a", quarterlyImpact: 0.9, executionCost: 0.2, scenarioRisk: 0.3, policyBounded: true },
        { id: "alt_b", quarterlyImpact: 0.8, executionCost: 0.1, scenarioRisk: 0.9, policyBounded: true },
        { id: "alt_c", quarterlyImpact: 0.7, executionCost: 0.1, scenarioRisk: 0.2, policyBounded: false }
      ]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scenarios.length).toBe(1);
    expect(result.scenarios[0]?.id).toBe("alt_a");
  });
});
