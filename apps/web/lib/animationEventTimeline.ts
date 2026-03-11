import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const eventSchema = z.object({ eventId: z.string().min(1), frame: z.number().int().nonnegative(), consumer: z.string().min(1) });
const requestSchema = z.object({ clipId: z.string().min(1), events: z.array(eventSchema).min(1) });
const policySchema = z.object({
  strictOrdering: z.boolean(),
  allowedConsumers: z.array(z.string().min(1)).min(1),
  maxEventsPerClip: z.number().int().positive()
});

const fallback = { strictOrdering: true, allowedConsumers: ["gameplay", "ux", "audio"], maxEventsPerClip: 128 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "animation-event-timeline.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateAnimationEventTimeline(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const policy = await loadPolicy();
  const events = parsed.data.events;
  const sortedFrames = [...events].map((event) => event.frame).sort((a, b) => a - b);
  const frames = events.map((event) => event.frame);
  const deterministicOrder = !policy.strictOrdering || frames.every((frame, index) => frame === sortedFrames[index]);

  const invalidConsumers = events
    .filter((event) => !policy.allowedConsumers.includes(event.consumer))
    .map((event) => event.consumer);

  return {
    ok: true as const,
    deterministicOrder,
    consumableByActions: invalidConsumers.length === 0,
    eventBudgetOk: events.length <= policy.maxEventsPerClip,
    invalidConsumers: Array.from(new Set(invalidConsumers)).sort()
  };
}
