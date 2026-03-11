import { NextResponse } from "next/server";
import {
  insertPlatformEvent,
  parseGamesEventPayload,
  resolveGamesHref,
  resolveGamesModuleName
} from "@/lib/platformEvents";
import { apiInvalidPayload } from "@/lib/apiError";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseGamesEventPayload(body);
  if (!parsed.success) {
    return apiInvalidPayload("Invalid telemetry payload");
  }

  await insertPlatformEvent({
    event: parsed.data.event,
    module: resolveGamesModuleName(parsed.data),
    href: resolveGamesHref(parsed.data),
    surface: parsed.data.surface
  });

  return NextResponse.json({ ok: true });
}
