import { describe, expect, it } from "vitest";
import { buildGovernanceDriftReport } from "@/lib/governanceDrift";

describe("governance drift monitor", () => {
  it("produces drift alerts with remediation proposals", async () => {
    const report = await buildGovernanceDriftReport();
    expect(report.totalSamples).toBeGreaterThan(0);
    expect(report.hasDrift).toBe(true);
    expect(report.driftSignals.length).toBeGreaterThan(0);
    expect(report.driftSignals[0].remediation.length).toBeGreaterThan(0);
  });
});
