import { describe, expect, it } from "vitest";
import { planDistributionOrchestratorVrArEndpoints } from "@/lib/distributionOrchestratorVrArEndpoints";

describe("distribution orchestrator for vr/ar endpoints", () => {
  it("writes policy-compliant distribution actions", async () => {
    const result = await planDistributionOrchestratorVrArEndpoints({
      endpointClass: "vr",
      rolloutPercentRequested: 80,
      certificationPassed: true,
      regionalCompliancePassed: true,
      fallbackPlanPresent: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.policyCompliantActionPlan).toBe(true);
    expect(result.actions.approvedRolloutPercent).toBe(80);
  });
});
