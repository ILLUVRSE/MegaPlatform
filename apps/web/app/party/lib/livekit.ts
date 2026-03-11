/**
 * LiveKit voice helpers for Party.
 * Request/response: fetches server-issued token and connects with livekit-client when available.
 * Guard: client-only.
 */
export type LiveKitConnection = {
  connected: boolean;
  muted: boolean;
  mode: "sdk" | "token-only";
  error?: string | null;
};

type VoiceTokenResponse = {
  token: string;
  url: string;
  roomName: string;
  identity: string;
  expiresInSec: number;
};

let activeRoom: {
  disconnect: () => void;
  localParticipant?: { setMicrophoneEnabled?: (enabled: boolean) => Promise<void> | void };
} | null = null;

async function requestVoiceToken(code: string) {
  const response = await fetch(`/api/party/${code}/voice/token`, {
    method: "POST"
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: "Voice token request failed." }))) as {
      error?: string;
    };
    throw new Error(payload.error ?? "Voice token request failed.");
  }
  return (await response.json()) as VoiceTokenResponse;
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
