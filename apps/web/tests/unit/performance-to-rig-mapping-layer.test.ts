import { describe, expect, it } from "vitest";
import { evaluatePerformanceToRigMappingLayer } from "@/lib/performanceToRigMappingLayer";

describe("performance-to-rig mapping layer", () => {
  it("validates mapping constraints and fallback behavior with fixtures", async () => {
    const result = await evaluatePerformanceToRigMappingLayer({ unmappedJoints: 1, fixtureCases: 2, fallbackTriggered: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mappingValid).toBe(true);
    expect(result.fallbackMode).toBe("bind-pose-lock");
  });
});
