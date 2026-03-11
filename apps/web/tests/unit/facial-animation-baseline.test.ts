import { describe, expect, it } from "vitest";
import { evaluateFacialAnimationBaseline } from "@/lib/facialAnimationBaseline";

describe("facial animation baseline", () => {
  it("maps baseline expressions to reusable controllers", async () => {
    const result = await evaluateFacialAnimationBaseline({
      expressionMap: { neutral: 0.2, joy: 0.6, sadness: 0.1, anger: 0.2, surprise: 0.3 },
      controllerIds: ["face-core-controller"]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.baselineReady).toBe(true);
    expect(result.controllerReuseValid).toBe(true);
  });
});
