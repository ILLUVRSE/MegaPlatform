import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const requestSchema = z.object({ lagMs: z.number().int().nonnegative(), jitterMs: z.number().int().nonnegative(), packetDropRate: z.number().min(0).max(1) });
const policySchema = z.object({ maxLagMs: z.number().int().nonnegative(), maxJitterMs: z.number().int().nonnegative(), maxPacketDropRate: z.number().min(0).max(1) });

const fallback = { maxLagMs: 120, maxJitterMs: 40, maxPacketDropRate: 0.02 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "live-mocap-streaming-runtime.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateLiveMocapStreamingRuntime(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  return {
    ok: true as const,
    boundedLag: parsed.data.lagMs <= policy.maxLagMs,
    boundedJitter: parsed.data.jitterMs <= policy.maxJitterMs,
    packetHealthOk: parsed.data.packetDropRate <= policy.maxPacketDropRate,
    runtimeStable:
      parsed.data.lagMs <= policy.maxLagMs &&
      parsed.data.jitterMs <= policy.maxJitterMs &&
      parsed.data.packetDropRate <= policy.maxPacketDropRate
  };
}
