import path from "path";
import { promises as fs } from "fs";
import { z } from "zod";

const policySchema = z.object({
  allowedCommands: z.array(z.string().min(1)).min(1),
  actionRoutes: z.record(z.string(), z.string().min(1))
});

const requestSchema = z.object({ transcript: z.string().min(1), confidence: z.number().min(0).max(1) });

const fallback = {
  allowedCommands: ["open_menu", "join_room", "mute_self"],
  actionRoutes: { open_menu: "ui.menu.open", join_room: "presence.room.join", mute_self: "audio.self.mute" }
};

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "voice-command-layer-xr.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function dispatchVoiceCommandXr(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };
  const policy = await loadPolicy();

  const normalized = parsed.data.transcript.trim().toLowerCase().replace(/\s+/g, "_");
  const command = policy.allowedCommands.find((value) => value === normalized);
  if (!command || parsed.data.confidence < 0.75) return { ok: false as const, reason: "command_not_routable" };

  return { ok: true as const, command, actionRoute: policy.actionRoutes[command], parsed: true, routed: true };
}
