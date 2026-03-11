import { describe, expect, it } from "vitest";
import { classifyEmergentBehavior } from "@/lib/emergentBehavior";

describe("emergent behavior monitoring", () => {
  it("classifies emergent events into risk/opportunity channels", async () => {
    const result = await classifyEmergentBehavior([
      { id: "e1", signal: "novel spike", novelty: 0.9, risk: 0.7, impact: 0.5 },
      { id: "e2", signal: "unexpected uplift", novelty: 0.8, risk: 0.2, impact: 0.8 }
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.events.some((event) => event.category === "risk")).toBe(true);
    expect(result.report.events.some((event) => event.category === "opportunity")).toBe(true);
  });
});
