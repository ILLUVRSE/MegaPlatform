import { describe, expect, it } from "vitest";
import { evaluateSocioTechnicalHealthIndex } from "@/lib/socioTechnicalHealthIndex";

describe("socio-technical health index", () => {
  it("influences autonomy bounds from combined health index", async () => {
    const result = await evaluateSocioTechnicalHealthIndex({
      system: 0.4,
      user: 0.5,
      creator: 0.5,
      operator: 0.4,
      requestedAutonomyBound: 0.8
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.enforcedAutonomyBound).toBeLessThan(0.8);
  });
});
