import { describe, expect, it } from "vitest";
import { evaluateTerrainAndScaleGovernance } from "@/lib/terrainAndScaleGovernance";

describe("terrain and scale governance", () => {
  it("catches out-of-policy world terrain and scale changes", async () => {
    const result = await evaluateTerrainAndScaleGovernance({
      worldScale: 1.5,
      maxTerrainSlopeDegrees: 30,
      terrainPatchCount: 220
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.policyCompliant).toBe(true);
    expect(result.scaleValid).toBe(true);
    expect(result.terrainValid).toBe(true);
  });
});
