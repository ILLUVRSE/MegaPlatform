import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  supportedDevices: z.array(z.string().min(1)).min(1),
  intentMap: z.record(z.string(), z.string().min(1))
});

const requestSchema = z.object({
  signals: z.array(z.object({ device: z.string().min(1), action: z.string().min(1), value: z.number().optional() })).min(1)
});

const fallback = {
  supportedDevices: ["controller", "hand", "gaze", "voice"],
  intentMap: { trigger: "select", pinch: "select", look_dwell: "focus", voice_confirm: "confirm" }
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "input-abstraction-layer-xr.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function normalizeXrInputIntents(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const normalized = parsed.data.signals
    .filter((signal) => policy.supportedDevices.includes(signal.device))
    .map((signal) => ({
      sourceDevice: signal.device,
      sourceAction: signal.action,
      intent: policy.intentMap[signal.action] ?? "unknown"
    }));

  return { ok: true as const, normalizedApi: true, normalizedIntents: normalized };
}
