import { describe, expect, it } from "vitest";
import { evaluatePolicyDecision } from "@/lib/policyEngine";

describe("policy engine v2", () => {
  it("denies prod promotion without approval", async () => {
    const result = await evaluatePolicyDecision({
      scope: "deployment",
      action: "prod.promote",
      attributes: {
        hasHumanApproval: false,
        securityScore: 0.99
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.allow).toBe(false);
    expect(result.matchedRuleId).toBe("deny-prod-deploy-without-approval");
  });

  it("allows prod promotion with approval and high security score", async () => {
    const result = await evaluatePolicyDecision({
      scope: "deployment",
      action: "prod.promote",
      attributes: {
        hasHumanApproval: true,
        securityScore: 0.95
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.allow).toBe(true);
    expect(result.matchedRuleId).toBe("allow-prod-deploy-approved-safe");
  });
});
