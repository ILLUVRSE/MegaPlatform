import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  stageStateFields: z.array(z.string().min(1)),
  audienceStateFields: z.array(z.string().min(1)),
  hostControlCapabilities: z.array(z.string().min(1))
});

const policySchema = z.object({
  requiredStageStateFields: z.array(z.string().min(1)).min(1),
  requiredAudienceStateFields: z.array(z.string().min(1)).min(1),
  requiredHostControlCapabilities: z.array(z.string().min(1)).min(1)
});

const fallback = {
  requiredStageStateFields: ["sceneId", "cueId", "timelineTick"],
  requiredAudienceStateFields: ["segmentLoads", "engagementMode"],
  requiredHostControlCapabilities: ["cue_dispatch", "safety_override", "audience_sync"]
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "shared-live-event-stages.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateSharedLiveEventStages(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const missingStageStateFields = policy.requiredStageStateFields.filter((field) => !parsed.data.stageStateFields.includes(field));
  const missingAudienceStateFields = policy.requiredAudienceStateFields.filter((field) => !parsed.data.audienceStateFields.includes(field));
  const missingHostControlCapabilities = policy.requiredHostControlCapabilities.filter(
    (capability) => !parsed.data.hostControlCapabilities.includes(capability)
  );

  return {
    ok: true as const,
    productionized: missingStageStateFields.length === 0 && missingAudienceStateFields.length === 0 && missingHostControlCapabilities.length === 0,
    missingStageStateFields,
    missingAudienceStateFields,
    missingHostControlCapabilities
  };
}
