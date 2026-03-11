import { describe, expect, it } from "vitest";
import { evaluateProceduralLocomotionRuntime } from "@/lib/proceduralLocomotionRuntime";

describe("procedural locomotion runtime", () => {
  it("integrates with IK and collision constraints", async () => {
    const result = await evaluateProceduralLocomotionRuntime({ ikIntegrated: true, collisionConstraintsApplied: true, stepError: 0.03 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.integratedWithIk).toBe(true);
    expect(result.integratedWithCollision).toBe(true);
    expect(result.proceduralRuntimeReady).toBe(true);
  });
});
