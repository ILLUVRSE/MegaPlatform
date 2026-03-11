import { describe, expect, it } from "vitest";
import { evaluateLiveEventFailoverDrills } from "@/lib/liveEventFailoverDrills";

describe("live event failover drills", () => {
  it("produces measurable recovery evidence and runbook coverage", async () => {
    const result = await evaluateLiveEventFailoverDrills({
      recoveryTimeMs: 18000,
      runbookEvidenceRecorded: true,
      recoveryEvidenceRecorded: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.failoverDrillReady).toBe(true);
    expect(result.drillEvidenceMet).toBe(true);
  });
});
