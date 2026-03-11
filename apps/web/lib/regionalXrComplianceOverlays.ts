import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const ratingOrder = ["everyone", "teen", "mature"] as const;
const ratingSchema = z.enum(ratingOrder);

const requestSchema = z.object({
  regionCode: z.string().min(2),
  contentRatingLabel: ratingSchema,
  biometricsEnabled: z.boolean(),
  recordingEnabled: z.boolean(),
  geoAnchoringEnabled: z.boolean()
});

const policySchema = z.object({
  restrictedBiometricRegions: z.array(z.string().min(2)),
  restrictedRecordingRegions: z.array(z.string().min(2)),
  highModerationRegions: z.array(z.string().min(2)),
  defaultContentRatingFloor: ratingSchema,
  strictContentRatingRegions: z.record(z.string(), ratingSchema)
});

const fallback = {
  restrictedBiometricRegions: ["eu", "br"],
  restrictedRecordingRegions: ["de", "kr"],
  highModerationRegions: ["uk", "ca", "au"],
  defaultContentRatingFloor: "teen" as const,
  strictContentRatingRegions: { de: "mature" as const, kr: "mature" as const }
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "regional-xr-compliance-overlays.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

function isRatingCompliant(actual: z.infer<typeof ratingSchema>, minimum: z.infer<typeof ratingSchema>) {
  return ratingOrder.indexOf(actual) >= ratingOrder.indexOf(minimum);
}

export async function evaluateRegionalXrComplianceOverlay(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();
  const region = parsed.data.regionCode.toLowerCase();

  const requireBiometricDisable = policy.restrictedBiometricRegions.includes(region);
  const requireRecordingDisable = policy.restrictedRecordingRegions.includes(region);
  const highModerationOverlay = policy.highModerationRegions.includes(region);

  const ratingFloor = policy.strictContentRatingRegions[region] ?? policy.defaultContentRatingFloor;
  const ratingCompliant = isRatingCompliant(parsed.data.contentRatingLabel, ratingFloor);

  const biometricCompliant = !requireBiometricDisable || !parsed.data.biometricsEnabled;
  const recordingCompliant = !requireRecordingDisable || !parsed.data.recordingEnabled;

  return {
    ok: true as const,
    overlayCompliant: biometricCompliant && recordingCompliant && ratingCompliant,
    overlayActions: {
      disableBiometrics: requireBiometricDisable,
      disableRecording: requireRecordingDisable,
      enforceHighModeration: highModerationOverlay,
      contentRatingFloor: ratingFloor
    },
    biometricCompliant,
    recordingCompliant,
    ratingCompliant
  };
}
