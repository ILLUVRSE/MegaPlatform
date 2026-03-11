import path from "path";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import { z } from "zod";
import { createSpatialTelemetryEvent } from "@/lib/spatialTelemetryTaxonomyV1";

const policySchema = z.object({
  requiredAnchorKinds: z.array(z.string().min(1)).min(1),
  defaultStabilityThreshold: z.number().min(0).max(1)
});

const requestSchema = z.object({
  identityId: z.string().min(1),
  worldId: z.string().min(1),
  anchors: z.array(
    z.object({
      key: z.string().min(1),
      kind: z.string().min(1),
      stability: z.number().min(0).max(1)
    })
  )
});

const fallback = {
  requiredAnchorKinds: ["head", "left_hand", "right_hand"],
  defaultStabilityThreshold: 0.85
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "spatial-identity-anchors.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

function anchorKey(identityId: string, worldId: string, kind: string) {
  return createHash("sha256").update(`${identityId}:${worldId}:${kind}`).digest("hex").slice(0, 24);
}

export async function restoreSpatialIdentityAnchors(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const policy = await loadPolicy();
  const restored = policy.requiredAnchorKinds.map((kind) => {
    const key = anchorKey(parsed.data.identityId, parsed.data.worldId, kind);
    const existing = parsed.data.anchors.find((anchor) => anchor.key === key);
    return {
      kind,
      key,
      restored: Boolean(existing) && (existing?.stability ?? 0) >= policy.defaultStabilityThreshold
    };
  });
  const telemetryEvent = await createSpatialTelemetryEvent({
    module: "identity_anchors",
    eventType: "motion",
    action: "anchors_restore",
    payload: { requiredKinds: policy.requiredAnchorKinds.length, restoredKinds: restored.filter((item) => item.restored).length }
  });

  return {
    ok: true as const,
    deterministicMapping: true,
    restored,
    restoreReliable: restored.every((item) => item.restored),
    telemetryEvent: telemetryEvent.ok ? telemetryEvent.event : null
  };
}
