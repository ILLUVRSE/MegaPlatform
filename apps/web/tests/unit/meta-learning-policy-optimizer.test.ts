import { describe, expect, it } from "vitest";
import { optimizeMetaLearningPolicy } from "@/lib/metaLearningPolicyOptimizer";

describe("meta-learning policy optimizer", () => {
  it("proposes policy updates from verified long-horizon signals", async () => {
    const result = await optimizeMetaLearningPolicy({
      signals: [
        { policyId: "policy_a", horizonDays: 120, performanceDelta: 0.6, verified: true },
        { policyId: "policy_a", horizonDays: 100, performanceDelta: 0.7, verified: true },
        { policyId: "policy_a", horizonDays: 95, performanceDelta: 0.5, verified: true },
        { policyId: "policy_b", horizonDays: 150, performanceDelta: 0.1, verified: false }
      ]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposals.length).toBe(1);
    expect(result.proposals[0]?.policyId).toBe("policy_a");
  });
});
