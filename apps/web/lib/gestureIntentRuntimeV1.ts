import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  minConfidence: z.number().min(0).max(1),
  gestureIntentMap: z.record(z.string(), z.string().min(1))
});

const requestSchema = z.object({
  surface: z.string().min(1),
  gestures: z.array(z.object({ name: z.string().min(1), confidence: z.number().min(0).max(1) })).min(1)
});

const fallback = {
  minConfidence: 0.8,
  gestureIntentMap: { pinch: "select", grab: "hold", swipe_left: "navigate_prev", swipe_right: "navigate_next" }
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "gesture-intent-runtime-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function resolveGestureIntents(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const resolved = parsed.data.gestures
    .filter((gesture) => gesture.confidence >= policy.minConfidence)
    .map((gesture) => ({ gesture: gesture.name, intent: policy.gestureIntentMap[gesture.name] ?? "unknown" }));

  return { ok: true as const, deterministic: true, surface: parsed.data.surface, resolved };
}
