export const dynamic = "force-dynamic";

/**
 * Minigame round start API (host only).
 * POST: { playerId } -> { ok }
 */
import { NextResponse } from "next/server";
import { startMinigameRound } from "@/lib/minigame/party/service";
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
    const result = await startMinigameRound(
      params.code,
      parsed.data.playerId,
      parsed.data.forceStart ?? false
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
