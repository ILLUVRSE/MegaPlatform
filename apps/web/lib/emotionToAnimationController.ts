import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({ emotionState: z.string().min(1), intensity: z.number().min(0).max(1), transitionCoherence: z.number().min(0).max(1) });
const policySchema = z.object({ maxIntensity: z.number().min(0).max(1), minimumTransitionCoherence: z.number().min(0).max(1), allowedEmotionStates: z.array(z.string().min(1)).min(1) });

const fallback = {
  maxIntensity: 0.9,
  minimumTransitionCoherence: 0.8,
  allowedEmotionStates: ["calm", "joy", "focus", "sadness", "anger"]
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "emotion-to-animation-controller.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateEmotionToAnimationController(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const allowedEmotion = policy.allowedEmotionStates.includes(parsed.data.emotionState);
  const intensityBounded = parsed.data.intensity <= policy.maxIntensity;
  const coherentTransition = parsed.data.transitionCoherence >= policy.minimumTransitionCoherence;

  return {
    ok: true as const,
    coherentTransition,
    intensityBounded,
    controllerReady: allowedEmotion && intensityBounded && coherentTransition
  };
}
