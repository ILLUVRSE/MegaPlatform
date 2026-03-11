import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({ densityPerCell: z.number().int().nonnegative(), frameTimeMs: z.number().nonnegative(), behaviorLodDowngrade: z.number().int().nonnegative() });
const policySchema = z.object({ targetDensityPerCell: z.number().int().positive(), maxFrameTimeMs: z.number().positive(), maxBehaviorLodDowngrade: z.number().int().nonnegative() });

const fallback = { targetDensityPerCell: 30, maxFrameTimeMs: 16.7, maxBehaviorLodDowngrade: 2 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "crowd-animation-system-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateCrowdAnimationSystemV1(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  return {
    ok: true as const,
    densityTargetMet: parsed.data.densityPerCell >= policy.targetDensityPerCell,
    frameBudgetMet: parsed.data.frameTimeMs <= policy.maxFrameTimeMs,
    lodBudgetMet: parsed.data.behaviorLodDowngrade <= policy.maxBehaviorLodDowngrade,
    runtimeReady:
      parsed.data.densityPerCell >= policy.targetDensityPerCell &&
      parsed.data.frameTimeMs <= policy.maxFrameTimeMs &&
      parsed.data.behaviorLodDowngrade <= policy.maxBehaviorLodDowngrade
  };
}
