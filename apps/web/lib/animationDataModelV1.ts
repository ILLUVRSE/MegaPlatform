import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const clipSchema = z.object({
  clipId: z.string().min(1),
  durationMs: z.number().int().positive(),
  frameRate: z.number().positive()
});

const stateSchema = z.object({
  stateId: z.string().min(1),
  clipId: z.string().min(1),
  loop: z.boolean()
});

const requestSchema = z.object({
  clips: z.array(clipSchema).min(1),
  states: z.array(stateSchema).min(1)
});

const policySchema = z.object({
  requiredClipFields: z.array(z.string().min(1)).min(1),
  requiredStateFields: z.array(z.string().min(1)).min(1),
  maxFrameRate: z.number().positive(),
  maxClipDurationMs: z.number().int().positive()
});

const fallback = {
  requiredClipFields: ["clipId", "durationMs", "frameRate"],
  requiredStateFields: ["stateId", "clipId", "loop"],
  maxFrameRate: 240,
  maxClipDurationMs: 600000
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "animation-data-model-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function ingestAnimationDataModelV1(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const policy = await loadPolicy();
  const clipIds = new Set(parsed.data.clips.map((clip) => clip.clipId));

  const oversizedClips = parsed.data.clips
    .filter((clip) => clip.durationMs > policy.maxClipDurationMs || clip.frameRate > policy.maxFrameRate)
    .map((clip) => clip.clipId)
    .sort();

  const orphanStates = parsed.data.states
    .filter((state) => !clipIds.has(state.clipId))
    .map((state) => state.stateId)
    .sort();

  return {
    ok: true as const,
    lifecycleContractValid: oversizedClips.length === 0 && orphanStates.length === 0,
    validatedClipCount: parsed.data.clips.length,
    validatedStateCount: parsed.data.states.length,
    schemaVersion: "animation-data-model-v1",
    oversizedClips,
    orphanStates
  };
}
