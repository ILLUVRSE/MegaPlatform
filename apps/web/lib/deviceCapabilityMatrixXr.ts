import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";
import { createSpatialTelemetryEvent } from "@/lib/spatialTelemetryTaxonomyV1";

const policySchema = z.object({
  requiredCapabilities: z.array(z.string().min(1)).min(1),
  featureRequirements: z.record(z.string(), z.array(z.string().min(1)).min(1)),
  fallbackByFeature: z.record(z.string(), z.string().min(1))
});

const requestSchema = z.object({
  deviceClass: z.string().min(1),
  availableCapabilities: z.array(z.string().min(1)),
  requestedFeatures: z.array(z.string().min(1))
});

const fallback = {
  requiredCapabilities: ["stereo_render", "pose_tracking"],
  featureRequirements: {
    hand_tracking: ["hands"],
    scene_mesh: ["scene_understanding"],
    passthrough: ["camera_passthrough"]
  },
  fallbackByFeature: {
    hand_tracking: "controller_input",
    scene_mesh: "bounded-play-area",
    passthrough: "virtual-skybox"
  }
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "device-capability-matrix-xr.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateDeviceCapabilityMatrixXr(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const policy = await loadPolicy();
  const missingRequiredCapabilities = policy.requiredCapabilities.filter(
    (capability) => !parsed.data.availableCapabilities.includes(capability)
  );

  const evaluatedFeatures = parsed.data.requestedFeatures.map((feature) => {
    const requirements = policy.featureRequirements[feature] ?? [];
    const supported = requirements.every((capability) => parsed.data.availableCapabilities.includes(capability));
    return {
      feature,
      supported,
      fallback: supported ? null : policy.fallbackByFeature[feature] ?? "feature_disabled"
    };
  });
  const telemetryEvent = await createSpatialTelemetryEvent({
    module: "capability_matrix",
    eventType: "interaction",
    action: "capabilities_evaluated",
    payload: { requestedFeatures: parsed.data.requestedFeatures.length, unsupported: evaluatedFeatures.filter((f) => !f.supported).length }
  });

  return {
    ok: true as const,
    deviceClass: parsed.data.deviceClass,
    baselineSupported: missingRequiredCapabilities.length === 0,
    missingRequiredCapabilities,
    evaluatedFeatures,
    telemetryEvent: telemetryEvent.ok ? telemetryEvent.event : null
  };
}
