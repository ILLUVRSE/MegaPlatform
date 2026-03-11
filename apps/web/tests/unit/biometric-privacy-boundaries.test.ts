import { describe, expect, it } from "vitest";
import { evaluateBiometricPrivacyBoundaries } from "@/lib/biometricPrivacyBoundaries";

describe("biometric privacy boundaries", () => {
  it("enforces policy-gated biometric handling with audit evidence path", async () => {
    const result = await evaluateBiometricPrivacyBoundaries({
      rawBiometricStorageEnabled: false,
      encryptionAtRestEnabled: true,
      retentionHours: 12,
      purposeBoundProcessing: true,
      auditEvidencePath: "docs/compliance/evidence/biometric/session-abc.json"
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.biometricPolicyCompliant).toBe(true);
    expect(result.auditEvidencePathCompliant).toBe(true);
  });
});
