import { describe, expect, it } from "vitest";
import { evaluateXrLaunchReadinessStoreCompliance } from "@/lib/xrLaunchReadinessStoreCompliance";

describe("xr launch readiness and store compliance", () => {
  it("blocks non-compliant launch states", async () => {
    const result = await evaluateXrLaunchReadinessStoreCompliance({
      storeChecklistPassed: true,
      performanceCertificationPassed: true,
      privacyDisclosuresPresent: true,
      ageRatingAssigned: true,
      blockingDefects: 0
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.launchReady).toBe(true);
    expect(result.launchBlocked).toBe(false);
  });
});
