import { describe, expect, it } from "vitest";
import { evaluateGpuBudgetController } from "@/lib/gpuBudgetController";

describe("gpu budget controller", () => {
  it("applies deterministic mitigations on gpu budget pressure", async () => {
    const result = await evaluateGpuBudgetController({
      gpuFrameTimeMs: 9.1,
      appliedMitigations: ["shadow_quality_drop", "particle_density_cap"],
      mitigationOrderDeterministic: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.gpuBudgetControlled).toBe(true);
    expect(result.deterministicMitigationOrderMet).toBe(true);
  });
});
