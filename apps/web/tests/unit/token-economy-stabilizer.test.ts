import { describe, expect, it } from "vitest";
import { stabilizeTokenEconomy } from "@/lib/tokenEconomyStabilizer";

describe("token economy stabilizer", () => {
  it("flags out-of-band token variance and suggests corrections", async () => {
    const result = await stabilizeTokenEconomy({ observedTokenBudget: 140000 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.withinControlBand).toBe(false);
    expect(result.actions.length).toBeGreaterThan(0);
  });
});
