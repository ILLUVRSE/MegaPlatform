export const dynamic = "force-dynamic";

/**
 * Party presence heartbeat API.
 * POST: -> { ok: true, lastSeenAt, pingCount, lastHostHeartbeatAt }
 * Guard: authenticated participant/host.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { getState, publish, setState } from "@illuvrse/world-state";
import { AuthzError, requireSession } from "@/lib/authz";
import { checkRateLimit, resolveClientKey } from "@/lib/rateLimit";

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
    key: `party:presence-ping:${resolveClientKey(request, principal.userId)}`,
    windowMs: 60_000,
    limit: 120
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { code } = await params;
  const party = await prisma.party.findUnique({
    where: { code },
    include: { seats: true }
  });
  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  const participant = await prisma.participant.findUnique({
    where: {
      partyId_userId: {
        partyId: party.id,
        userId: principal.userId
      }
    },
    select: { displayName: true }
  });
  const isHost = party.hostId === principal.userId;
  if (!participant && !isHost) {
    return NextResponse.json({ error: "Join party first" }, { status: 403 });
  }

  const state = await getState(party.id, party.seats.length);
  const nowIso = new Date().toISOString();
  const current = state.participants[principal.userId];
  state.participants[principal.userId] = {
    displayName: participant?.displayName ?? current?.displayName ?? (isHost ? "Host" : null),
    joinedAt: current?.joinedAt ?? nowIso,
    lastSeenAt: nowIso,
    seatIndex: current?.seatIndex ?? null
  };
  state.heartbeat = {
    lastSeenAt: nowIso,
    lastHostHeartbeatAt: isHost ? nowIso : (state.heartbeat?.lastHostHeartbeatAt ?? null),
    pingCount: (state.heartbeat?.pingCount ?? 0) + 1
  };
  await setState(party.id, state);
  await publish(party.id, {
    type: "presence_update",
    userId: principal.userId,
    displayName: state.participants[principal.userId].displayName ?? null,
    lastSeenAt: nowIso,
    status: "updated"
  });
  await publish(party.id, {
    type: "keepalive",
    ts: nowIso,
    lastSeenAt: state.heartbeat.lastSeenAt,
    lastHostHeartbeatAt: state.heartbeat.lastHostHeartbeatAt,
    pingCount: state.heartbeat.pingCount
  });
  if (isHost) {
    await publish(party.id, {
      type: "snapshot",
      state,
      reason: "heartbeat"
    });
  }

  return NextResponse.json({
    ok: true,
    lastSeenAt: nowIso,
    pingCount: state.heartbeat.pingCount,
    lastHostHeartbeatAt: state.heartbeat.lastHostHeartbeatAt
  });
}
