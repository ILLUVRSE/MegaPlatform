import { describe, expect, it } from "vitest";
import { solveUnifiedConstraints } from "@/lib/unifiedConstraintSolver";

describe("unified constraint solver", () => {
  it("resolves cross-scope constraints with deterministic trace order", async () => {
    const result = await solveUnifiedConstraints({
      domain: "finance",
      attributes: {
        riskLevel: "high",
        costTier: "elevated"
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(["deny", "require_approval", "allow"]).toContain(result.decision);
    expect(result.trace.length).toBe(result.matchedRuleCount);
    expect(result.trace.every((entry) => entry.executableKey.length > 0)).toBe(true);
  });
});
