import { describe, expect, it } from "vitest";
import { buildExecutiveBriefing } from "@/lib/executiveBriefing";

describe("executive briefing generator", () => {
  it("builds briefing with required strategic sections", async () => {
    const briefing = await buildExecutiveBriefing();
    expect(briefing.summary.length).toBeGreaterThan(0);
    expect(Array.isArray(briefing.risks)).toBe(true);
    expect(Array.isArray(briefing.wins)).toBe(true);
    expect(Array.isArray(briefing.blockers)).toBe(true);
    expect(Array.isArray(briefing.nextActions)).toBe(true);
  });
});
