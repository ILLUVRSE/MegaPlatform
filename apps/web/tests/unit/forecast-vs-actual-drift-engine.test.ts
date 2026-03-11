import { describe, expect, it } from "vitest";
import { evaluateForecastActualDrift } from "@/lib/forecastActualDriftEngine";

describe("forecast vs actual drift engine", () => {
  it("triggers corrective budget actions for critical drift", async () => {
    const result = await evaluateForecastActualDrift({
      programId: "prog-162",
      forecastSpendCents: 10000,
      actualSpendCents: 14000
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.report.severity).toBe("critical");
    expect(result.policyActionTriggered).toBe(true);
    expect(result.report.correctiveActions.length).toBeGreaterThan(0);
  });
});
