import { describe, expect, it } from "vitest";
import { evaluateBlastRadiusGuardrails } from "@/lib/autonomyBlastRadius";

describe("autonomy blast-radius guardrails", () => {
  it("blocks actions that exceed configured blast-radius limits", async () => {
    const result = await evaluateBlastRadiusGuardrails({
      actionId: "action-125",
      riskScore: 0.8,
      affectedDomains: ["ops", "finance", "growth"],
      estimatedAffectedUsers: 9000
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.allowed).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });
});
