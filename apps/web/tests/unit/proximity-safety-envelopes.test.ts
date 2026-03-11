import { describe, expect, it } from "vitest";
import { evaluateProximitySafetyEnvelopes } from "@/lib/proximitySafetyEnvelopes";

describe("proximity safety envelopes", () => {
  it("triggers configurable runtime protections on envelope violations", async () => {
    const result = await evaluateProximitySafetyEnvelopes({
      nearestDistanceMeters: 0.6,
      sustainedViolationSeconds: 3.4,
      comfortBoundaryBreaches: 3,
      hapticWarningApplied: true,
      autoRepositionApplied: true,
      interactionCooldownApplied: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelopeViolation).toBe(true);
    expect(result.runtimeProtectionsTriggered).toBe(true);
  });
});
