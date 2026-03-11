import { describe, expect, it } from "vitest";
import { validateAnimationPerformanceRightsAutomation } from "@/lib/animationPerformanceRightsAutomation";

describe("animation/performance rights automation", () => {
  it("enforces rights policy automatically in publish/distribution paths", async () => {
    const result = await validateAnimationPerformanceRightsAutomation({
      performanceConsentPresent: true,
      licenseTokenPresent: true,
      territoryCovered: true,
      rightsExpired: false,
      rightsMismatchDetected: false
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rightsAutomationCompliant).toBe(true);
    expect(result.mismatchCompliant).toBe(true);
  });
});
