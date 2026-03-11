export const dynamic = "force-dynamic";

/**
 * Minigame party join API.
 * POST: { playerName } -> { playerId }
 */
import { NextResponse } from "next/server";
import { joinMinigamePartyRoom } from "@/lib/minigame/party/service";
import { joinRoomSchema } from "@/lib/minigame/party/validation";

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  const body = await request.json();
  const parsed = joinRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const result = await joinMinigamePartyRoom(params.code, parsed.data.playerName);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
