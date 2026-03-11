export const dynamic = "force-dynamic";

/**
 * Party playback API.
 * POST: { action, leaderTime, playbackPositionMs, currentIndex, playbackState } -> playback snapshot
 * Guard: host-only (authenticated principal).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { getState, publish, setState } from "@illuvrse/world-state";
import { AuthzError, requireSession } from "@/lib/authz";
import { checkRateLimit, resolveClientKey } from "@/lib/rateLimit";

const playbackSchema = z.object({
  action: z.enum(["heartbeat", "play", "pause", "resume", "advance"]),
  leaderTime: z.number(),
  playbackPositionMs: z.number(),
  currentIndex: z.number().int().min(0),
  playbackState: z.enum(["idle", "playing", "paused"])
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  let principal;
  try {
    principal = await requireSession(request);
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit({
    key: `party:playback:${resolveClientKey(request, principal.userId)}`,
    windowMs: 60_000,
    limit: 120
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { code } = await params;
  const body = await request.json();
  const parsed = playbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const party = await prisma.party.findUnique({
    where: { code },
    include: { seats: true }
  });

  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  if (party.hostId !== principal.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const playlistCount = await prisma.playlistItem.count({ where: { partyId: party.id } });
  const maxIndex = Math.max(0, playlistCount - 1);
  const clampedIndex = Math.min(parsed.data.currentIndex, maxIndex);

  if (parsed.data.action !== "heartbeat") {
    await prisma.party.update({
      where: { id: party.id },
      data: {
        currentIndex: clampedIndex,
        playbackState: parsed.data.playbackState
      }
    });
  }

  const state = await getState(party.id, party.seats.length);
  state.playback = {
    currentIndex: clampedIndex,
    playbackState: parsed.data.playbackState,
    leaderTime: parsed.data.leaderTime,
    playbackPositionMs: parsed.data.playbackPositionMs,
    leaderId: principal.userId
  };
  await setState(party.id, state);

  await publish(party.id, {
    type: "playback_update",
    leaderTime: parsed.data.leaderTime,
    playbackPositionMs: parsed.data.playbackPositionMs,
    currentIndex: clampedIndex,
    playbackState: parsed.data.playbackState,
    leaderId: principal.userId
  });

  return NextResponse.json({
    currentIndex: clampedIndex,
    playbackState: parsed.data.playbackState,
    leaderTime: parsed.data.leaderTime,
    playbackPositionMs: parsed.data.playbackPositionMs,
    leaderId: principal.userId
  });
}
