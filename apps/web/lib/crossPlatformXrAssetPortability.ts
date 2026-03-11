import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  sourceRuntime: z.string().min(1),
  targetRuntime: z.string().min(1),
  formatCompatible: z.boolean(),
  rightsCleared: z.boolean(),
  compatibilityScore: z.number().min(0).max(1),
  policyBypassRequested: z.boolean()
});

const policySchema = z.object({
  allowedRuntimes: z.array(z.string().min(1)),
  requireRightsClearance: z.boolean(),
  requireFormatCompatibility: z.boolean(),
  minimumCompatibilityScore: z.number().min(0).max(1),
  allowPolicyBypass: z.boolean()
});

const fallback = {
  allowedRuntimes: ["openxr", "webxr", "visionos"],
  requireRightsClearance: true,
  requireFormatCompatibility: true,
  minimumCompatibilityScore: 0.8,
  allowPolicyBypass: false
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), "ops", "governance", "cross-platform-xr-asset-portability.json"),
      "utf-8"
    );
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function validateCrossPlatformXrAssetPortability(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const sourceAllowed = policy.allowedRuntimes.includes(parsed.data.sourceRuntime.toLowerCase());
  const targetAllowed = policy.allowedRuntimes.includes(parsed.data.targetRuntime.toLowerCase());
  const rightsCompliant = !policy.requireRightsClearance || parsed.data.rightsCleared;
  const formatCompliant = !policy.requireFormatCompatibility || parsed.data.formatCompatible;
  const compatibilityCompliant = parsed.data.compatibilityScore >= policy.minimumCompatibilityScore;
  const bypassCompliant = policy.allowPolicyBypass || !parsed.data.policyBypassRequested;

  return {
    ok: true as const,
    portabilityCompliant:
      sourceAllowed && targetAllowed && rightsCompliant && formatCompliant && compatibilityCompliant && bypassCompliant,
    sourceAllowed,
    targetAllowed,
    rightsCompliant,
    formatCompliant,
    compatibilityCompliant,
    bypassCompliant
  };
}
