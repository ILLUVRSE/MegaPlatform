import { describe, expect, it } from "vitest";
import { validateRigContractStandardization } from "@/lib/rigContractStandardization";

describe("rig contract standardization", () => {
  it("blocks incompatible skeleton and constraint combinations", async () => {
    const result = await validateRigContractStandardization({
      skeletonType: "humanoid",
      boneCount: 120,
      constraints: [
        { constraintId: "c-ik", type: "ik" },
        { constraintId: "c-twist", type: "twist" }
      ]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.compatible).toBe(false);
    expect(result.incompatibleReasons).toContain("blocked_constraint_pair:ik+twist");
  });
});
