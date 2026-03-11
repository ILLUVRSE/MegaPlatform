import { describe, expect, it } from "vitest";
import { evaluateRolloutGuardrails } from "@/lib/rolloutGuardrails";

describe("rollout guardrails", () => {
  it("triggers rollback for excessive regression", async () => {
    const result = await evaluateRolloutGuardrails([{ metricKey: "watch_completion_rate", regressionRatio: 0.2 }]);
    expect(result.rollbackTriggered).toBe(true);
  });
});
