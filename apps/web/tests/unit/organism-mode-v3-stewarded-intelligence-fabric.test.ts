import { describe, expect, it } from "vitest";
import { evaluateOrganismModeV3 } from "@/lib/organismModeV3StewardedIntelligenceFabric";

describe("organism mode v3 stewarded intelligence fabric", () => {
  it("verifies compliant outcomes and stewardship controls", async () => {
    const result = await evaluateOrganismModeV3({
      outcomeWindows: [
        { compliantRuns: 9, totalRuns: 10 },
        { compliantRuns: 10, totalRuns: 10 },
        { compliantRuns: 9, totalRuns: 10 }
      ],
      activeStewardshipControls: ["audit_log", "approval_gate", "human_review"]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sustainCompliantOutcomes).toBe(true);
    expect(result.verifiedStewardshipControls).toBe(true);
  });
});
