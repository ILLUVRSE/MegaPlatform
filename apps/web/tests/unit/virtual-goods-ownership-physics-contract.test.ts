import { describe, expect, it } from "vitest";
import { validateVirtualGoodsOwnershipPhysicsContract } from "@/lib/virtualGoodsOwnershipPhysicsContract";

describe("virtual goods ownership physics contract", () => {
  it("prevents inconsistent ownership states across lifecycle", async () => {
    const result = await validateVirtualGoodsOwnershipPhysicsContract({
      ownerId: "owner-1",
      holderId: "owner-1",
      transferInProgress: true,
      escrowLockActive: true,
      concurrentOwnershipClaims: 1,
      stateVersion: 2
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ownershipStateConsistent).toBe(true);
    expect(result.transferLockCompliant).toBe(true);
  });
});
