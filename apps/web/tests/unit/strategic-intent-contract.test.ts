import { describe, expect, it } from "vitest";
import { validateStrategicIntent } from "@/lib/strategicIntent";

describe("strategic intent contract", () => {
  it("validates intent artifacts against contract requirements", async () => {
    const result = await validateStrategicIntent({
      intentId: "intent-123",
      objective: "improve resilience",
      owner: "director",
      horizon: "quarter",
      successMetric: "incident_recovery_time",
      policyReference: "ops/governance/autonomy-policies.json"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.valid).toBe(true);
    expect(result.intent.intentId).toBe("intent-123");
  });
});
