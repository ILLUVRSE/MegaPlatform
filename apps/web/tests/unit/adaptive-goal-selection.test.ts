import { describe, expect, it } from "vitest";
import { selectAdaptiveGoals } from "@/lib/adaptiveGoalSelection";

describe("adaptive goal selection", () => {
  it("selects explainable goals within policy bounds", async () => {
    const result = await selectAdaptiveGoals();
    expect(result.ok).toBe(true);
    if (!result.ok || result.blocked) return;
    expect(result.goals.length).toBeLessThanOrEqual(3);
    expect(result.goals.every((goal) => goal.rationale.length > 0)).toBe(true);
  });
});
