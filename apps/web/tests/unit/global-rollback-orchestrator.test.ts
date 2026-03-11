import { describe, expect, it } from "vitest";
import { buildGlobalRollbackPlan } from "@/lib/globalRollbackOrchestrator";

describe("global rollback orchestrator", () => {
  it("builds deterministic rollback steps with class-aware ordering", async () => {
    const result = await buildGlobalRollbackPlan({
      changes: [
        {
          changeId: "c-policy-1",
          changeClass: "policy",
          priority: 1,
          rollbackAction: "restore policy snapshot"
        },
        {
          changeId: "c-runtime-1",
          changeClass: "runtime",
          priority: 2,
          rollbackAction: "stop rollout"
        }
      ]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.steps[0]?.changeClass).toBe("runtime");
    expect(result.stepCount).toBe(2);
  });
});
