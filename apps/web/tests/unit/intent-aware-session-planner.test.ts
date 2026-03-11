import { describe, expect, it } from "vitest";
import { planIntentAwareSession } from "@/lib/intentAwareSessionPlanner";

describe("intent-aware session planner", () => {
  it("prioritizes explicit and high-confidence inferred intents", async () => {
    const result = await planIntentAwareSession({
      explicitIntents: ["create"],
      inferredIntents: [{ intent: "relax", confidence: 0.7 }],
      availableModules: ["studio", "watch", "shorts"],
      riskLevel: "low"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan[0]).toBe("studio");
    expect(result.usedFallback).toBe(false);
  });

  it("uses policy-safe fallback under low confidence and high risk", async () => {
    const result = await planIntentAwareSession({
      explicitIntents: [],
      inferredIntents: [{ intent: "compete", confidence: 0.2 }],
      availableModules: ["watch", "shorts", "home"],
      riskLevel: "high"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.usedFallback).toBe(true);
    expect(result.plan.length).toBe(1);
  });
});
