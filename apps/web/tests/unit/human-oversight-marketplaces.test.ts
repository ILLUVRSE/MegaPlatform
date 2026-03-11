import { describe, expect, it } from "vitest";
import { assignHumanOversight } from "@/lib/humanOversightMarketplaces";

describe("human oversight marketplaces", () => {
  it("routes reviews by policy with traceability and sla bounds", async () => {
    const result = await assignHumanOversight({ decisionId: "d1", impactLevel: "high", domain: "safety" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.assignment.traceable).toBe(true);
    expect(result.assignment.slaHours).toBe(4);
  });
});
