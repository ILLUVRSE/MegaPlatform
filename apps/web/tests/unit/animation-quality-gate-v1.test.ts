import { describe, expect, it } from "vitest";
import { evaluateAnimationQualityGateV1 } from "@/lib/animationQualityGateV1";

describe("animation quality gate v1", () => {
  it("enforces quality thresholds in CI and publish contexts", async () => {
    const result = await evaluateAnimationQualityGateV1({
      jitter: 0.01,
      footSlip: 0.01,
      poseError: 0.02,
      gateContext: "ci"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.gatePassed).toBe(true);
    expect(result.enforcedInCi).toBe(true);
  });
});
