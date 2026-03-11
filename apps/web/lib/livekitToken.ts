import { createHmac } from "crypto";

const DEFAULT_TTL_SEC = 60 * 60;
const MIN_TTL_SEC = 60;
const MAX_TTL_SEC = 24 * 60 * 60;

function base64Url(input: Buffer | string) {
  const source = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf-8");
  return source.toString("base64url");
}

export function getLiveKitServerConfig() {
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim() ?? "";
  const apiKey = process.env.LIVEKIT_API_KEY?.trim() ?? "";
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim() ?? "";
  return { url, apiKey, apiSecret };
}

export function isLiveKitConfigured() {
  const config = getLiveKitServerConfig();
  return Boolean(config.url && config.apiKey && config.apiSecret);
}

export function createLiveKitAccessToken(input: {
  apiKey: string;
  apiSecret: string;
  identity: string;
  roomName: string;
  metadata?: string;
  ttlSec?: number;
}) {
  const ttl = Number.isFinite(input.ttlSec)
    ? Math.min(MAX_TTL_SEC, Math.max(MIN_TTL_SEC, Math.floor(input.ttlSec as number)))
    : DEFAULT_TTL_SEC;
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  const payload: Record<string, unknown> = {
    iss: input.apiKey,
    sub: input.identity,
    iat: now,
    nbf: now - 5,
    exp: now + ttl,
    video: {
      room: input.roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true
    }
  };

  if (input.metadata) payload.metadata = input.metadata;

  const headerSegment = base64Url(JSON.stringify(header));
  const payloadSegment = base64Url(JSON.stringify(payload));
  const body = `${headerSegment}.${payloadSegment}`;
  const signature = createHmac("sha256", input.apiSecret).update(body).digest("base64url");
  return {
    token: `${body}.${signature}`,
    expiresInSec: ttl
  };
}
