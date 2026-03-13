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
import {
  PLAYBACK_SOFT_LOCK_MS,
  resolveAuthoritativePlaybackSnapshot,
  shouldSoftLockTimeline
} from "@/app/party/lib/playback";

const playbackSchema = z.object({
  action: z.enum(["heartbeat", "play", "pause", "resume", "advance", "seek"]),
  leaderTime: z.number(),
  playbackPositionMs: z.number().nonnegative(),
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
  const now = Date.now();
  const currentPlayback = resolveAuthoritativePlaybackSnapshot(await getState(party.id, party.seats.length).then((state) => state.playback), now, {
    currentIndex: party.currentIndex,
    playbackState: party.playbackState,
    leaderId: principal.userId
  });

  const requestedPlaybackState =
    parsed.data.action === "resume" ? currentPlayback.playbackState : parsed.data.playbackState;
  const requestedIndex = parsed.data.action === "resume" ? currentPlayback.currentIndex : clampedIndex;
  const requestedPositionMs =
    parsed.data.action === "resume"
      ? currentPlayback.playbackPositionMs
      : parsed.data.action === "advance"
        ? 0
        : parsed.data.playbackPositionMs;
  const shouldSoftLock =
    parsed.data.action === "seek" ||
    parsed.data.action === "advance" ||
    shouldSoftLockTimeline(currentPlayback, {
      currentIndex: requestedIndex,
      playbackPositionMs: requestedPositionMs
    });
  const timelineRevision = currentPlayback.timelineRevision + (shouldSoftLock ? 1 : 0);
  const nextPlayback = {
    currentIndex: requestedIndex,
    playbackState: requestedPlaybackState,
    leaderTime: now,
    playbackPositionMs: requestedPositionMs,
    leaderId: principal.userId,
    timelineRevision,
    syncSequence: currentPlayback.syncSequence + 1,
    softLockUntil: shouldSoftLock ? now + PLAYBACK_SOFT_LOCK_MS : undefined,
    lastAction: parsed.data.action,
    lastHeartbeatAt: now
  };

  if (parsed.data.action !== "heartbeat") {
    await prisma.party.update({
      where: { id: party.id },
      data: {
        currentIndex: requestedIndex,
        playbackState: requestedPlaybackState
      }
    });
  }

  const state = await getState(party.id, party.seats.length);
  state.playback = nextPlayback;
  await setState(party.id, state);

  await publish(party.id, {
    type: "playback_update",
    ...nextPlayback
  });

  return NextResponse.json(nextPlayback);
}
