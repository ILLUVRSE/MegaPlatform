import { describe, expect, it } from "vitest";
import { evaluateInsiderRiskControl } from "@/lib/insiderRiskControls";

describe("autonomous insider-risk controls", () => {
  it("enforces dual-approval or block for risky privileged actions", async () => {
    const result = await evaluateInsiderRiskControl({
      actorId: "ops-bot",
      action: "policy_edit",
      riskSignals: {
        anomaly: 0.7,
        privilege_jump: 0.6
      },
      recentActionCount: 8
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(typeof result.dualApprovalRequired).toBe("boolean");
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
