/**
 * LiveKit voice helpers for Party.
 * Request/response: fetches server-issued token and connects with livekit-client when available.
 * Guard: client-only.
 */
import { isPartyVoiceTokenPayload, type PartyVoiceTokenResponse } from "@/lib/partyVoice";

export type LiveKitConnection = {
  connected: boolean;
  muted: boolean;
  mode: "sdk" | "token-only";
  error?: string | null;
};

type ReconnectConfig = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

const reconnectConfig: ReconnectConfig = {
  maxAttempts: Number(process.env.NEXT_PUBLIC_PARTY_VOICE_RECONNECT_ATTEMPTS ?? 3),
  baseDelayMs: Number(process.env.NEXT_PUBLIC_PARTY_VOICE_RECONNECT_BASE_MS ?? 500),
  maxDelayMs: Number(process.env.NEXT_PUBLIC_PARTY_VOICE_RECONNECT_MAX_MS ?? 4_000)
};

let activeRoom: {
  disconnect: () => void;
  localParticipant?: { setMicrophoneEnabled?: (enabled: boolean) => Promise<void> | void };
} | null = null;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBackoffDelay(attempt: number) {
  return Math.min(reconnectConfig.maxDelayMs, reconnectConfig.baseDelayMs * 2 ** attempt);
}

async function requestVoiceToken(code: string) {
  let attempt = 0;
  while (attempt < reconnectConfig.maxAttempts) {
    const response = await fetch(`/api/party/${code}/voice/token`, {
      method: "POST"
    });
    if (response.ok) {
      return (await response.json()) as PartyVoiceTokenResponse;
    }

    const payload = (await response.json().catch(() => ({ error: "Voice token request failed." }))) as {
      error?: string;
      retryAfterSec?: number;
    };

    if (response.status !== 429 || attempt === reconnectConfig.maxAttempts - 1) {
      throw new Error(payload.error ?? "Voice token request failed.");
    }

    const delayMs =
      payload.retryAfterSec && payload.retryAfterSec > 0
        ? payload.retryAfterSec * 1000
        : getBackoffDelay(attempt);
    attempt += 1;
    await sleep(delayMs);
  }

  throw new Error("Voice token request failed.");
}

async function tryLoadLiveKitClient() {
  const moduleName = "livekit-client";
  try {
    const module = (await import(moduleName)) as {
      Room?: new () => {
        connect: (url: string, token: string) => Promise<void>;
        disconnect: () => void;
        localParticipant?: { setMicrophoneEnabled?: (enabled: boolean) => Promise<void> | void };
      };
    };
    return module.Room ?? null;
  } catch {
    return null;
  }
}

export async function connectToLiveKit(code: string): Promise<LiveKitConnection> {
  const tokenPayload = await requestVoiceToken(code);
  if (!isPartyVoiceTokenPayload(tokenPayload)) {
    return {
      connected: false,
      muted: false,
      mode: "token-only",
      error:
        tokenPayload.reason === "livekit_not_configured"
          ? "Voice is running in fallback mode because LiveKit is not configured."
          : "Voice is temporarily unavailable; continuing without LiveKit."
    };
  }
  const RoomCtor = await tryLoadLiveKitClient();

  if (!RoomCtor) {
    return {
      connected: true,
      muted: false,
      mode: "token-only",
      error: "livekit-client package not installed; token issued successfully."
    };
  }

  const room = new RoomCtor();
  await room.connect(tokenPayload.url, tokenPayload.token);
  activeRoom = room;
  return { connected: true, muted: false, mode: "sdk", error: null };
}

export async function disconnectFromLiveKit(): Promise<LiveKitConnection> {
  try {
    activeRoom?.disconnect();
  } catch {
    // ignore disconnect failures
  } finally {
    activeRoom = null;
  }
  return { connected: false, muted: false, mode: "sdk", error: null };
}

export async function toggleMute(current: boolean): Promise<boolean> {
  const next = !current;
  const room = activeRoom;
  const setter = room?.localParticipant?.setMicrophoneEnabled;
  if (setter) {
    await setter(!next);
  }
  return next;
}
