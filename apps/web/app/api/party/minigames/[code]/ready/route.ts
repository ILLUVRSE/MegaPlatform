export const dynamic = "force-dynamic";

/**
 * Minigame ready toggle API.
 * POST: { ready } -> { ok }
 */
import { NextResponse } from "next/server";
import { setMinigameReady } from "@/lib/minigame/party/service";
import { readySchema } from "@/lib/minigame/party/validation";

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  const body = await request.json();
  const parsed = readySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const playerId = request.headers.get("x-player-id");
  if (!playerId) {
    return NextResponse.json({ error: "Missing player id" }, { status: 400 });
  }

  try {
    const result = await setMinigameReady(params.code, playerId, parsed.data.ready);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
