import { describe, expect, it } from "vitest";
import { evaluateAdaptiveFriction } from "@/lib/adaptiveFrictionSystem";

describe("adaptive friction system", () => {
  it("applies medium-tier friction interventions", async () => {
    const result = await evaluateAdaptiveFriction({
      sessionId: "s147",
      riskScore: 0.5,
      priorInterventions: 1,
      confidence: 0.8
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tier).toBe("medium");
    expect(result.interventions).toContain("confirm_action");
  });

  it("falls back to manual review when intervention cap is reached", async () => {
    const result = await evaluateAdaptiveFriction({
      sessionId: "s147-cap",
      riskScore: 0.9,
      priorInterventions: 3,
      confidence: 0.4
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.interventions).toContain("manual_review");
    expect(result.interventionCapReached).toBe(true);
  });
});
