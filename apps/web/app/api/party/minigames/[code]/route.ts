export const dynamic = "force-dynamic";

/**
 * Minigame party room metadata API.
 * GET: -> { state }
 */
import { NextResponse } from "next/server";
import { getMinigamePartyState } from "@illuvrse/world-state";

export async function GET(
  _request: Request,
  { params }: { params: { code: string } }
) {
  const state = await getMinigamePartyState(params.code);
  if (!state) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  return NextResponse.json({ state });
}
