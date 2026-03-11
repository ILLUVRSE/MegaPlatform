import { NextResponse } from "next/server";
import { insertPlatformEvent, parsePlatformAppEventPayload } from "@/lib/platformEvents";
import { apiInvalidPayload } from "@/lib/apiError";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parsePlatformAppEventPayload(body);
  if (!parsed.success) {
    return apiInvalidPayload("Invalid event payload");
  }

  await insertPlatformEvent(parsed.data);

  return NextResponse.json({ ok: true });
}
