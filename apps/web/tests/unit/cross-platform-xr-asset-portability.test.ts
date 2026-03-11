import { describe, expect, it } from "vitest";
import { validateCrossPlatformXrAssetPortability } from "@/lib/crossPlatformXrAssetPortability";

describe("cross-platform xr asset portability", () => {
  it("validates compatibility and rights constraints for portability", async () => {
    const result = await validateCrossPlatformXrAssetPortability({
      sourceRuntime: "openxr",
      targetRuntime: "webxr",
      formatCompatible: true,
      rightsCleared: true,
      compatibilityScore: 0.92,
      policyBypassRequested: false
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.portabilityCompliant).toBe(true);
    expect(result.rightsCompliant).toBe(true);
  });
});
