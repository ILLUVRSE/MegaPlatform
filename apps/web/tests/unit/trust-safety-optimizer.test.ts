import { describe, expect, it } from "vitest";
import { optimizeTrustSafety } from "@/lib/trustSafetyOptimizer";

describe("trust safety optimizer", () => {
  it("rejects unsafe gain patterns", async () => {
    const result = await optimizeTrustSafety([
      { id: "c1", engagementGain: 0.2, safetyRisk: 0.4 },
      { id: "c2", engagementGain: 0.1, safetyRisk: 0.1 }
    ]);
    expect(result.rejected.length).toBeGreaterThan(0);
    expect(result.accepted.length).toBeGreaterThan(0);
  });
});
