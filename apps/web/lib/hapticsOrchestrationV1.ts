import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const hapticProfileSchema = z.object({ amplitude: z.number().min(0).max(1), durationMs: z.number().int().positive() });
const policySchema = z.object({ profiles: z.record(z.string(), hapticProfileSchema), requiredCapability: z.string().min(1) });
const requestSchema = z.object({ profile: z.string().min(1), deviceCapabilities: z.array(z.string().min(1)), runtimeContext: z.string().min(1) });

const fallback = {
  profiles: {
    confirm: { amplitude: 0.6, durationMs: 40 },
    warning: { amplitude: 0.8, durationMs: 80 },
    success: { amplitude: 0.5, durationMs: 55 }
  },
  requiredCapability: "haptics"
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "haptics-orchestration-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function orchestrateHapticsV1(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  if (!parsed.data.deviceCapabilities.includes(policy.requiredCapability)) return { ok: false as const, reason: "unsupported_device" };
  const selected = policy.profiles[parsed.data.profile];
  if (!selected) return { ok: false as const, reason: "unknown_profile" };

  return { ok: true as const, profile: parsed.data.profile, runtimeContext: parsed.data.runtimeContext, selected };
}
