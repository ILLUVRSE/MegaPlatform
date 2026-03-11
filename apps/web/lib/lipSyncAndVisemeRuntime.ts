import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({
  visemeTimeline: z.array(z.object({ viseme: z.string().min(1), timestampMs: z.number().int().nonnegative() })).min(1),
  timelineDriftMs: z.number().int().nonnegative(),
  coverage: z.number().min(0).max(1)
});

const policySchema = z.object({
  requiredVisemes: z.array(z.string().min(1)).min(1),
  maxTimelineDriftMs: z.number().int().nonnegative(),
  minimumTimelineCoverage: z.number().min(0).max(1)
});

const fallback = {
  requiredVisemes: ["AA", "EE", "OO", "MBP", "FV"],
  maxTimelineDriftMs: 40,
  minimumTimelineCoverage: 0.95
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "lip-sync-and-viseme-runtime.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateLipSyncAndVisemeRuntime(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const policy = await loadPolicy();
  const timelineVisemes = new Set(parsed.data.visemeTimeline.map((event) => event.viseme));
  const missingVisemes = policy.requiredVisemes.filter((viseme) => !timelineVisemes.has(viseme));

  const stableIntegration =
    parsed.data.timelineDriftMs <= policy.maxTimelineDriftMs &&
    parsed.data.coverage >= policy.minimumTimelineCoverage &&
    missingVisemes.length === 0;

  return {
    ok: true as const,
    stableIntegration,
    timelineDriftMs: parsed.data.timelineDriftMs,
    coverage: parsed.data.coverage,
    missingVisemes: missingVisemes.sort()
  };
}
