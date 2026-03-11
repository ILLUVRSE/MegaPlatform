import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  rawBiometricStorageEnabled: z.boolean(),
  encryptionAtRestEnabled: z.boolean(),
  retentionHours: z.number().nonnegative(),
  purposeBoundProcessing: z.boolean(),
  auditEvidencePath: z.string().min(1)
});

const policySchema = z.object({
  allowRawBiometricStorage: z.boolean(),
  requireEncryptionAtRest: z.boolean(),
  maxRetentionHours: z.number().nonnegative(),
  requirePurposeBinding: z.boolean(),
  requireAuditEvidencePath: z.boolean()
});

const fallback = {
  allowRawBiometricStorage: false,
  requireEncryptionAtRest: true,
  maxRetentionHours: 24,
  requirePurposeBinding: true,
  requireAuditEvidencePath: true
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "biometric-privacy-boundaries.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateBiometricPrivacyBoundaries(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const rawStorageCompliant = policy.allowRawBiometricStorage || !parsed.data.rawBiometricStorageEnabled;
  const encryptionCompliant = !policy.requireEncryptionAtRest || parsed.data.encryptionAtRestEnabled;
  const retentionCompliant = parsed.data.retentionHours <= policy.maxRetentionHours;
  const purposeBindingCompliant = !policy.requirePurposeBinding || parsed.data.purposeBoundProcessing;
  const auditEvidencePathCompliant = !policy.requireAuditEvidencePath || parsed.data.auditEvidencePath.trim().length > 0;

  return {
    ok: true as const,
    biometricPolicyCompliant:
      rawStorageCompliant &&
      encryptionCompliant &&
      retentionCompliant &&
      purposeBindingCompliant &&
      auditEvidencePathCompliant,
    rawStorageCompliant,
    encryptionCompliant,
    retentionCompliant,
    purposeBindingCompliant,
    auditEvidencePathCompliant,
    auditEvidencePath: parsed.data.auditEvidencePath
  };
}
