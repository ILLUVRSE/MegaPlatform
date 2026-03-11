export const dynamic = "force-dynamic";

/**
 * Minigame next round API (host only).
 * POST: { playerId } -> { ok }
 */
import { NextResponse } from "next/server";
import { nextMinigameRound } from "@/lib/minigame/party/service";
import { hostActionSchema } from "@/lib/minigame/party/validation";

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  const body = await request.json();
  const parsed = hostActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const result = await nextMinigameRound(params.code, parsed.data.playerId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
