import { describe, expect, it } from "vitest";
import { evaluateTrustPreservingGrowth } from "@/lib/trustPreservingGrowthEngine";

describe("trust-preserving growth engine", () => {
  it("allows growth action when trust and safety risks are within policy limits", async () => {
    const result = await evaluateTrustPreservingGrowth({
      action: "gentle_recommendation",
      signals: { trust_score: 0.9, safety_score: 0.85, abuse_score: 0.1 }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.allowed).toBe(true);
  });

  it("blocks growth action when trust constraints are exceeded", async () => {
    const result = await evaluateTrustPreservingGrowth({
      action: "aggressive_push",
      signals: { trust_score: 0.5, safety_score: 0.6, abuse_score: 0.4 }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.allowed).toBe(false);
    expect(result.blockedReasons).toContain("action_policy_blocked");
  });
});
