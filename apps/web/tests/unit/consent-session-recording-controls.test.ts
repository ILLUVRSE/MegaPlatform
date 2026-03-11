import { describe, expect, it } from "vitest";
import { evaluateConsentSessionRecordingControls } from "@/lib/consentSessionRecordingControls";

describe("consent and session recording controls", () => {
  it("requires policy-compliant explicit consent state for recording", async () => {
    const result = await evaluateConsentSessionRecordingControls({
      explicitConsentGranted: true,
      consentAgeMinutes: 15,
      sessionScopedConsent: true,
      consentRevoked: false,
      youthSession: true,
      guardianConsentGranted: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recordingAllowed).toBe(true);
    expect(result.explicitConsentCompliant).toBe(true);
  });
});
