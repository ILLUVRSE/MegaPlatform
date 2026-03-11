export const dynamic = "force-dynamic";

/**
 * Minigame presence ping API.
 * POST: -> { ok }
 */
import { NextResponse } from "next/server";
import { pingMinigamePartyPlayer } from "@/lib/minigame/party/service";

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  const playerId = request.headers.get("x-player-id");
  if (!playerId) {
    return NextResponse.json({ error: "Missing player id" }, { status: 400 });
  }

  try {
    const result = await pingMinigamePartyPlayer(params.code, playerId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
