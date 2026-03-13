export type PartyVoiceTokenPayload = {
  mode: "token";
  fallback: false;
  token: string;
  url: string;
  roomName: string;
  identity: string;
  expiresInSec: number;
};

export type PartyVoiceFallbackPayload = {
  mode: "token-only";
  fallback: true;
  reason: "livekit_not_configured" | "token_issue_failed";
  roomName: string;
  identity: string;
};

export type PartyVoiceTokenResponse = PartyVoiceTokenPayload | PartyVoiceFallbackPayload;

export function isPartyVoiceTokenPayload(
  payload: PartyVoiceTokenResponse
): payload is PartyVoiceTokenPayload {
  return payload.mode === "token";
}
