import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  sequenceVersion: z.string().min(1),
  trackCount: z.number().int().nonnegative(),
  playbackJitterMs: z.number().nonnegative(),
  deterministicEventOrder: z.boolean()
});

const policySchema = z.object({
  maxTracks: z.number().int().positive(),
  requireVersionedSequence: z.boolean(),
  maxPlaybackJitterMs: z.number().nonnegative()
});

const fallback = { maxTracks: 12, requireVersionedSequence: true, maxPlaybackJitterMs: 25 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "cutscene-sequencer-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateCutsceneSequencerV1(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const versioned = !policy.requireVersionedSequence || parsed.data.sequenceVersion.trim().length > 0;
  const trackBudgetMet = parsed.data.trackCount <= policy.maxTracks;
  const playbackStable = parsed.data.playbackJitterMs <= policy.maxPlaybackJitterMs;

  return {
    ok: true as const,
    sequencerReady: versioned && trackBudgetMet && playbackStable && parsed.data.deterministicEventOrder,
    versioned,
    trackBudgetMet,
    playbackStable
  };
}
