import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  artifactsQueryable: z.boolean(),
  deterministicTimelineRefs: z.boolean(),
  captureDelayMs: z.number().nonnegative()
});

const policySchema = z.object({
  requireQueryableArtifacts: z.boolean(),
  requireDeterministicTimelineRefs: z.boolean(),
  maxCaptureDelayMs: z.number().nonnegative()
});

const fallback = {
  requireQueryableArtifacts: true,
  requireDeterministicTimelineRefs: true,
  maxCaptureDelayMs: 900
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "replay-and-highlight-capture.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateReplayAndHighlightCapture(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const queryabilityMet = !policy.requireQueryableArtifacts || parsed.data.artifactsQueryable;
  const timelineDeterminismMet = !policy.requireDeterministicTimelineRefs || parsed.data.deterministicTimelineRefs;
  const captureDelayMet = parsed.data.captureDelayMs <= policy.maxCaptureDelayMs;

  return {
    ok: true as const,
    captureReady: queryabilityMet && timelineDeterminismMet && captureDelayMet,
    queryabilityMet,
    timelineDeterminismMet,
    captureDelayMet
  };
}
