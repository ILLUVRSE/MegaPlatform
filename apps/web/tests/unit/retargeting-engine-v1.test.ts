import { describe, expect, it } from "vitest";
import { evaluateRetargetingEngineV1 } from "@/lib/retargetingEngineV1";

describe("retargeting engine v1", () => {
  it("outputs consistent motion with quality checks", async () => {
    const result = await evaluateRetargetingEngineV1({
      sourceRigFamily: "humanoid",
      targetRigFamily: "stylized_humanoid",
      qualityScore: 0.95,
      jointError: 0.03
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.consistentMotion).toBe(true);
    expect(result.qualityChecksPassed).toBe(true);
  });
});
