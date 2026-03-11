import { describe, expect, it } from "vitest";
import { planStrategicFailureRecovery } from "@/lib/strategicFailureRecoveryPlanner";

describe("strategic failure recovery planner", () => {
  it("creates staged roll-forward and rollback-safe interventions", async () => {
    const result = await planStrategicFailureRecovery({
      failures: [
        { id: "f1", severity: 0.9, reversible: true },
        { id: "f2", severity: 0.7, reversible: true }
      ]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recoveryPlan[0]?.mode).toBe("roll_forward");
    expect(result.recoveryPlan[1]?.mode).toBe("rollback_ready");
  });
});
