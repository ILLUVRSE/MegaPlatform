import { NextResponse } from "next/server";
import { apiInvalidPayload, apiRateLimited } from "@/lib/apiError";
import { checkRateLimit, resolveClientKey } from "@/lib/rateLimit";
import {
  buildGamesPlatformEventInsert,
  insertPlatformEvent,
  parseGamesTelemetryPayload
} from "@/lib/platformEvents";

const CLIENT_RATE_LIMIT = {
  windowMs: 60_000,
  limit: 60
} as const;

const GAME_RATE_LIMIT = {
  windowMs: 60_000,
  limit: 240
} as const;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseGamesTelemetryPayload(body);
  if (!parsed.success) {
    return apiInvalidPayload("Invalid telemetry payload", parsed.error.issues.map((issue) => issue.message));
  }

  const clientRateLimit = await checkRateLimit({
    key: `games-telemetry:client:${resolveClientKey(request, "games-telemetry")}`,
    ...CLIENT_RATE_LIMIT
  });
  if (!clientRateLimit.ok) {
    return apiRateLimitedResponse(clientRateLimit.retryAfterSec, "Too many telemetry events from this client");
  }

  const gameRateLimit = await checkRateLimit({
    key: `games-telemetry:game:${parsed.data.gameId}`,
    ...GAME_RATE_LIMIT
  });
  if (!gameRateLimit.ok) {
    return apiRateLimitedResponse(gameRateLimit.retryAfterSec, "Too many telemetry events for this game");
  }

  await insertPlatformEvent(buildGamesPlatformEventInsert(parsed.data));

  return NextResponse.json({ ok: true });
}

function apiRateLimitedResponse(retryAfterSec: number, message: string) {
  const response = apiRateLimited(message);
  response.headers.set("Retry-After", String(retryAfterSec));
  return response;
}
