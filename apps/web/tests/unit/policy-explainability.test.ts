import { describe, expect, it } from "vitest";
import { explainPolicyDecision } from "@/lib/policyExplainability";

describe("policy explainability", () => {
  it("returns decision sections with deterministic trace payload", async () => {
    const result = await explainPolicyDecision({
      domain: "ops",
      attributes: { riskLevel: "low" },
      atIso: "2026-03-04T16:00:00.000Z",
      blastRadius: {
        actionId: "exp-127",
        riskScore: 0.3,
        affectedDomains: ["ops"],
        estimatedAffectedUsers: 120
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.explainability.sections.constraint.decisionSource.length).toBeGreaterThan(0);
    expect(result.explainability.sections.temporal.decision.length).toBeGreaterThan(0);
  });
});
