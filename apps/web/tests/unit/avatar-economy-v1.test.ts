import { describe, expect, it } from "vitest";
import { evaluateAvatarEconomyV1 } from "@/lib/avatarEconomyV1";

describe("avatar economy v1", () => {
  it("enforces policy-driven and auditable avatar economy flows", async () => {
    const result = await evaluateAvatarEconomyV1({
      ownershipVerified: true,
      entitlementProofPresent: true,
      upgradeCost: 450,
      userBalance: 1000,
      ledgerFieldCount: 5
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.economyFlowCompliant).toBe(true);
    expect(result.ownershipCompliant).toBe(true);
  });
});
