import { describe, expect, it } from "vitest";
import path from "path";
import {
  createChaosExperiment,
  finalizeChaosExperiment,
  recordChaosFault,
  recordChaosSample
} from "../../../../packages/observability/chaos-metrics";
import {
  parseDurationMs,
  runScenario
} from "../../../../tools/chaos/chaos-runner.mjs";

describe("party chaos scenario", () => {
  it("simulates a Party Rooms network partition and flags auto-rollback when SLOs collapse", async () => {
    const durationMs = parseDurationMs("30s");
    const { report } = await runScenario({
      scenario: "party-network-partition",
      durationMs,
      outputDir: path.join(process.cwd(), "artifacts", "chaos-tests")
    });

    expect(report.faults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "latency" }),
        expect.objectContaining({ type: "drop_packets" }),
        expect.objectContaining({ type: "kill_worker" }),
        expect.objectContaining({ type: "patch_response" })
      ])
    );
    expect(report.samples.some((sample) => sample.metadata.activeFaults.includes("drop_packets"))).toBe(true);
    expect(report.sloImpact.availability.worst).toBeLessThan(0.985);
    expect(report.autoRollbackTriggered).toBe(true);

    const experiment = createChaosExperiment({
      name: report.name,
      scenario: report.scenario,
      durationMs,
      sloTargets: {
        latencyP95Ms: 400,
        availability: 0.985,
        errorRate: 0.03
      },
      rollbackCriteria: [
        {
          metricKey: "availability",
          operator: "<=",
          threshold: 0.97,
          reason: "availability dropped below the rollback floor"
        }
      ]
    });

    for (const fault of report.faults) {
      recordChaosFault(experiment, fault);
    }
    for (const sample of report.samples) {
      recordChaosSample(experiment, sample);
    }

    const summary = finalizeChaosExperiment(experiment);

    expect(summary.autoRollbackTriggered).toBe(true);
    expect(summary.rollbackReasons).toContain("availability dropped below the rollback floor");
    expect(summary.sloImpact.latencyP95Ms.worst).toBeGreaterThan(400);
    expect(summary.sloImpact.errorRate.worst).toBeGreaterThan(0.03);
  });
});
