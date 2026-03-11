import { computeStorageCostCents, estimateRenderCostCents, evaluateLaunchGate } from "@/lib/platformGovernance";

describe("platform governance helpers", () => {
  it("estimates render costs by known job type", () => {
    expect(estimateRenderCostCents("SHORT_RENDER")).toBe(45);
    expect(estimateRenderCostCents("UNKNOWN_TYPE")).toBe(0);
  });

  it("computes storage cost in cents from bytes", () => {
    const oneGb = 1024 * 1024 * 1024;
    expect(computeStorageCostCents(oneGb)).toBeCloseTo(2.3, 5);
  });

  it("evaluates launch gates against max allowance", () => {
    expect(evaluateLaunchGate(0, 0)).toBe(true);
    expect(evaluateLaunchGate(1, 0)).toBe(false);
    expect(evaluateLaunchGate(2, 2)).toBe(true);
  });
});
