export const dynamic = "force-dynamic";

/**
 * Party metadata API.
 * GET: -> { party: { code, partyId, name, seatCount, hostId, playlist, playback }, state }
 * Guard: none; public metadata.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { getState } from "@illuvrse/world-state";

export async function GET(
  _request: Request,
  { params }: { params: { code: string } }
) {
  const party = await prisma.party.findUnique({
    where: { code: params.code },
    include: {
      seats: true,
      playlist: { orderBy: { order: "asc" } },
      participants: { orderBy: { joinedAt: "asc" } }
    }
  });

  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  const seatCount = party.seats.length;
  const state = await getState(party.id, seatCount);
  const fallbackLeader =
    party.participants.find((participant) => participant.userId === party.hostId)?.userId ??
    party.participants[0]?.userId ??
    party.hostId;

  return NextResponse.json({
    party: {
      partyId: party.id,
      code: party.code,
      name: party.name,
      seatCount,
      hostId: party.hostId,
      playlist: party.playlist,
      playback: {
        currentIndex: party.currentIndex,
        playbackState: party.playbackState,
        leaderId: fallbackLeader
      }
    },
    state
  });
}
