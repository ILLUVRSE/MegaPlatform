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

  it("evaluates inline YAML policy documents for infrastructure targets", async () => {
    const result = await evaluatePolicyDecision(
      {
        scope: "infrastructure",
        action: "db.destructive",
        target: {
          kind: "infra",
          resource: "episode",
          operation: "delete"
        },
        attributes: {
          scheduledProgramCount: 2
        }
      },
      {
        policy: `
version: "3.0"
defaultEffect: deny
rules:
  - id: deny-live-delete
    scope: infrastructure
    action: db.destructive
    effect: deny
    priority: 100
    targetKind: infra
    resources: [episode]
    operations: [delete]
    conditions:
      - key: scheduledProgramCount
        operator: gte
        value: 1
`
      }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.allow).toBe(false);
    expect(result.matchedRuleId).toBe("deny-live-delete");
    expect(result.policyVersion).toBe("3.0");
  });
});
