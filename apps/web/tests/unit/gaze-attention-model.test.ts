import { describe, expect, it } from "vitest";
import { evaluateGazeAttention } from "@/lib/gazeAttentionModel";

describe("gaze and attention model", () => {
  it("computes canonical gaze context with policy controls", async () => {
    const result = await evaluateGazeAttention({
      dwellMs: 700,
      fixationStability: 0.9,
      policyControlsEnabled: ["ranking_hook_opt_in", "privacy_masking"]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.attentionActive).toBe(true);
    expect(result.rankingHookAllowed).toBe(true);
  });
});
