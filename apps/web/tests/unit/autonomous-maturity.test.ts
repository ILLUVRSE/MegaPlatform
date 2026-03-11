import { describe, expect, it } from "vitest";
import { buildAutonomousMaturityCertification } from "@/lib/autonomousMaturity";

describe("autonomous maturity certification", () => {
  it("computes maturity score and certification status", async () => {
    const result = await buildAutonomousMaturityCertification();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(typeof result.certified).toBe("boolean");
  });
});
