import { describe, expect, it } from "vitest";
import { evaluateOrganismModeActivation } from "@/lib/organismMode";

describe("organism mode v1", () => {
  it("evaluates bounded activation with governance and maturity gates", async () => {
    const status = await evaluateOrganismModeActivation();
    expect(typeof status.active).toBe("boolean");
    expect(typeof status.reason).toBe("string");
    expect(status.briefingPath.length).toBeGreaterThan(0);
  });
});
