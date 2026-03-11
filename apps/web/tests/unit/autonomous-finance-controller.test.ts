import { describe, expect, it } from "vitest";
import { evaluateAutonomousFinanceAction } from "@/lib/autonomousFinanceController";

describe("autonomous finance controller", () => {
  it("blocks actions that exceed dynamic financial constraints", async () => {
    const result = await evaluateAutonomousFinanceAction({
      actionId: "act-161",
      actionType: "high_risk_experiment",
      estimatedSpendCents: 3100,
      spentLastHourCents: 19000,
      remainingBudgetCents: 1000,
      totalBudgetCents: 20000
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.gating).toBe("blocked");
    expect(result.blockers).toContain("blocked_action_type");
    expect(result.blockers).toContain("action_spend_limit_exceeded");
    expect(result.blockers).toContain("hourly_budget_limit_exceeded");
  });
});
