import { describe, expect, it } from "vitest";
import { evaluateEnvironmentalStorytellingAgentHooks } from "@/lib/environmentalStorytellingAgentHooks";

describe("environmental storytelling agent hooks", () => {
  it("constrains agent hooks by storytelling safety guardrails", async () => {
    const result = await evaluateEnvironmentalStorytellingAgentHooks({
      hookType: "ambient_shift",
      mutationScope: 2,
      safetyGuardrailPassed: true,
      storyContextSafe: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.hooksPermitted).toBe(true);
    expect(result.guardrailsPassed).toBe(true);
  });
});
