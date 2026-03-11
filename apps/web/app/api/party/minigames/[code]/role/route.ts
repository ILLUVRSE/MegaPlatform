export const dynamic = "force-dynamic";

/**
 * Minigame role update API.
 * POST: { role } -> { ok }
 */
import { NextResponse } from "next/server";
import { setMinigameRole } from "@/lib/minigame/party/service";
import { roleSchema } from "@/lib/minigame/party/validation";

export async function POST(
  request: Request,
  { params }: { params: { code: string } }
) {
  const body = await request.json();
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const playerId = request.headers.get("x-player-id");
  if (!playerId) {
    return NextResponse.json({ error: "Missing player id" }, { status: 400 });
  }

  try {
    const result = await setMinigameRole(params.code, playerId, parsed.data.role);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
