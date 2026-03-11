import { describe, expect, it } from "vitest";
import { evaluateCpuFrameBudgetController } from "@/lib/cpuFrameBudgetController";

describe("cpu frame budget controller", () => {
  it("uses bounded fallbacks when cpu frame budget is exceeded", async () => {
    const result = await evaluateCpuFrameBudgetController({
      cpuFrameTimeMs: 6.3,
      appliedFallbacks: ["animation_update_throttle", "script_tick_budget"],
      boundedFallbackBehavior: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.cpuBudgetControlled).toBe(true);
    expect(result.boundedBehaviorMet).toBe(true);
  });
});
