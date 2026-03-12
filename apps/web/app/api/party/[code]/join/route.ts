export const dynamic = "force-dynamic";

/**
 * Party join API.
 * POST: { displayName? } -> { status: "ok" }
 * Guard: authenticated.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { getState, publish, setState } from "@illuvrse/world-state";
import { AuthzError, requireSession } from "@/lib/authz";
import { checkRateLimit, resolveClientKey } from "@/lib/rateLimit";
import { apiInvalidPayload, apiNotFound, apiRateLimited, apiUnauthorized } from "@/lib/apiError";

const joinSchema = z.object({
  displayName: z.string().max(60).optional()
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
      return apiUnauthorized(error.message);
    }
    return apiUnauthorized();
  }

  const rateLimit = await checkRateLimit({
    key: `party:join:${resolveClientKey(request, principal.userId)}`,
    windowMs: 60_000,
    limit: 30
  });
  if (!rateLimit.ok) {
    return apiRateLimited();
  }

  const { code } = await params;
  const body = await request.json();
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return apiInvalidPayload();
  }

  const party = await prisma.party.findUnique({
    where: { code },
    include: { seats: true }
  });

  if (!party) {
    return apiNotFound("Party not found");
  }

  await prisma.participant.upsert({
    where: {
      partyId_userId: {
        partyId: party.id,
        userId: principal.userId
      }
    },
    update: {
      displayName: parsed.data.displayName ?? null
    },
    create: {
      partyId: party.id,
      userId: principal.userId,
      displayName: parsed.data.displayName ?? null
    }
  });

  const state = await getState(party.id, party.seats.length);
  const nowIso = new Date().toISOString();
  state.participants[principal.userId] = {
    displayName: parsed.data.displayName ?? null,
    joinedAt: state.participants[principal.userId]?.joinedAt ?? nowIso,
    lastSeenAt: nowIso
  };
  state.heartbeat = {
    lastSeenAt: state.heartbeat?.lastSeenAt ?? nowIso,
    lastHostHeartbeatAt:
      party.hostId === principal.userId
        ? nowIso
        : (state.heartbeat?.lastHostHeartbeatAt ?? null),
    pingCount: state.heartbeat?.pingCount ?? 0
  };
  await setState(party.id, state);

  await publish(party.id, {
    type: "presence_update",
    userId: principal.userId,
    displayName: parsed.data.displayName ?? null,
    lastSeenAt: nowIso,
    status: "joined"
  });
  await publish(party.id, {
    type: "snapshot",
    state,
    reason: "reconnect"
  });

  return NextResponse.json({ status: "ok" });
}
