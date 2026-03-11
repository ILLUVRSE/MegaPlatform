import { describe, expect, it } from "vitest";
import { evaluateAutonomyChangeBudget } from "@/lib/autonomyChangeBudgeting";

describe("autonomy change budgeting", () => {
  it("reports warning/blocked states from projected budget usage", async () => {
    const result = await evaluateAutonomyChangeBudget({
      changeClass: "policy",
      consumedUnits: 25,
      requestedUnits: 4
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(["ok", "warning", "blocked"]).toContain(result.status);
    expect(typeof result.allowed).toBe("boolean");
  });
});
