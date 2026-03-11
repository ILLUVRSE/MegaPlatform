import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  taxonomyVersion: z.string().min(1),
  allowedModules: z.array(z.string().min(1)).min(1),
  allowedEventTypes: z.array(z.string().min(1)).min(1)
});

const eventSchema = z.object({
  module: z.string().min(1),
  eventType: z.string().min(1),
  action: z.string().min(1),
  payload: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
});

const fallback = {
  taxonomyVersion: "v1",
  allowedModules: ["xr_contract", "capability_matrix", "identity_anchors", "scene_graph"],
  allowedEventTypes: ["session", "motion", "interaction"]
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "spatial-telemetry-taxonomy-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function createSpatialTelemetryEvent(rawEvent: unknown) {
  const parsed = eventSchema.safeParse(rawEvent);
  if (!parsed.success) return { ok: false as const, reason: "invalid_event" };
  const policy = await loadPolicy();
  if (!policy.allowedModules.includes(parsed.data.module)) return { ok: false as const, reason: "module_not_allowed" };
  if (!policy.allowedEventTypes.includes(parsed.data.eventType)) return { ok: false as const, reason: "event_type_not_allowed" };
  return { ok: true as const, event: { taxonomyVersion: policy.taxonomyVersion, ...parsed.data } };
}
