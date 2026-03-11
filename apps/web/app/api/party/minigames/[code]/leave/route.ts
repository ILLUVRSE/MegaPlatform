export const dynamic = "force-dynamic";

/**
 * Minigame party leave API.
 * POST: { playerId } -> { ok }
 */
import { NextResponse } from "next/server";
import { leaveMinigamePartyRoom } from "@/lib/minigame/party/service";
import { leaveSchema } from "@/lib/minigame/party/validation";

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  const body = await request.json();
  const parsed = leaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const result = await leaveMinigamePartyRoom(params.code, parsed.data.playerId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
