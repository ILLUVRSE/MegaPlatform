import { describe, expect, it } from "vitest";
import { evaluateSelfHealingActions } from "@/lib/selfHealing";

describe("self-healing behaviors", () => {
  it("triggers rollback-safe healing actions when regressions breach thresholds", async () => {
    const result = await evaluateSelfHealingActions({
      module: "watch",
      errorRate: 0.12,
      p95LatencyMs: 2600,
      recentDeployId: "deploy-116"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.triggerHealing).toBe(true);
    expect(result.actions.every((action) => action.rollbackSafe)).toBe(true);
  });
});
