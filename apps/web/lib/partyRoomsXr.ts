import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({ requiredFlowCapabilities: z.array(z.string().min(1)).min(1), allowGuestJoin: z.boolean() });
const requestSchema = z.object({ enabledCapabilities: z.array(z.string().min(1)), isGuest: z.boolean() });

const fallback = { requiredFlowCapabilities: ["room_join", "voice", "playlist", "host_controls"], allowGuestJoin: true };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "party-rooms-xr.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function evaluatePartyRoomsXrFlow(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const missingCapabilities = policy.requiredFlowCapabilities.filter((capability) => !parsed.data.enabledCapabilities.includes(capability));
  const joinAllowed = !parsed.data.isGuest || policy.allowGuestJoin;

  return { ok: true as const, flowOperational: missingCapabilities.length === 0 && joinAllowed, missingCapabilities, joinAllowed };
}
