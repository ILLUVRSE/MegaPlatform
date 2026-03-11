import { describe, expect, it } from "vitest";
import { runSimulation, validateRolloutPreflight } from "@/lib/simulationSandbox";

describe("simulation sandbox", () => {
  it("produces simulation report and preflight decision", async () => {
    const report = await runSimulation({
      changeType: "ranking_policy",
      expectedLift: 0.08,
      expectedRisk: 0.2,
      confidence: 0.75
    });
    expect(report.pass).toBe(true);
    const preflight = await validateRolloutPreflight(report);
    expect(preflight.pass).toBe(true);
  });
});
