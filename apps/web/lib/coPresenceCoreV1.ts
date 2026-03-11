import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const participantSchema = z.object({ id: z.string().min(1), poseDriftMeters: z.number().nonnegative(), stateVersion: z.number().int().nonnegative(), reconnecting: z.boolean() });
const policySchema = z.object({ maxPoseDriftMeters: z.number().nonnegative(), conflictStrategy: z.string().min(1), reconnectWindowMs: z.number().int().positive() });
const requestSchema = z.object({ participants: z.array(participantSchema).min(1), elapsedSinceDisconnectMs: z.number().int().nonnegative() });

const fallback = { maxPoseDriftMeters: 0.3, conflictStrategy: "highest_version_wins", reconnectWindowMs: 30000 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "co-presence-core-v1.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluateCoPresenceCoreV1(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const poseStable = parsed.data.participants.every((p) => p.poseDriftMeters <= policy.maxPoseDriftMeters);
  const reconnectStable = parsed.data.elapsedSinceDisconnectMs <= policy.reconnectWindowMs;
  const highestVersion = Math.max(...parsed.data.participants.map((p) => p.stateVersion));
  const conflictResolvedParticipants = parsed.data.participants.filter((p) => p.stateVersion === highestVersion).map((p) => p.id);

  return {
    ok: true as const,
    poseStateSyncStable: poseStable && reconnectStable,
    reconnectStable,
    conflictStrategy: policy.conflictStrategy,
    conflictResolvedParticipants
  };
}
