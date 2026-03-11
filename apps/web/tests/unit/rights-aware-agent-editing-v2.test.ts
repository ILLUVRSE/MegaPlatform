import { describe, expect, it } from "vitest";
import { enforceRightsAwareEditing } from "@/lib/rightsAwareAgentEditing";

describe("rights-aware agent editing v2", () => {
  it("allows derivative edit when rights constraints are satisfied", async () => {
    const result = await enforceRightsAwareEditing({
      assetId: "asset-152",
      licenseState: "active",
      grantedRights: ["derivative", "distribution"],
      hasAttribution: true,
      pendingClaims: 0
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.allowed).toBe(true);
  });

  it("blocks edit when rights policy is violated", async () => {
    const result = await enforceRightsAwareEditing({
      assetId: "asset-152-bad",
      licenseState: "disputed",
      grantedRights: ["distribution"],
      hasAttribution: false,
      pendingClaims: 1
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.allowed).toBe(false);
    expect(result.blockers).toContain("blocked_license_state");
  });
});
