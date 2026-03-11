export const dynamic = "force-dynamic";

/**
 * Party voice token API.
 * POST: -> { token, url, roomName, identity, expiresInSec }
 * Guard: authenticated participant/host only.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { AuthzError, requireSession } from "@/lib/authz";
import { checkRateLimit, resolveClientKey } from "@/lib/rateLimit";
import { createLiveKitAccessToken, getLiveKitServerConfig, isLiveKitConfigured } from "@/lib/livekitToken";

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
    key: `party:voice-token:${resolveClientKey(request, principal.userId)}`,
    windowMs: 60_000,
    limit: 30
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  if (!isLiveKitConfigured()) {
    return NextResponse.json(
      { error: "LiveKit is not configured on this deployment." },
      { status: 503 }
    );
  }

  const { code } = await params;
  const party = await prisma.party.findUnique({
    where: { code },
    select: { id: true, hostId: true, code: true }
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
    return NextResponse.json({ error: "Join party before requesting voice token." }, { status: 403 });
  }

  const identity = principal.userId;
  const displayName = participant?.displayName ?? (isHost ? "Host" : principal.name ?? "Guest");
  const roomName = `party-${party.code}`;
  const { apiKey, apiSecret, url } = getLiveKitServerConfig();
  const token = createLiveKitAccessToken({
    apiKey,
    apiSecret,
    identity,
    roomName,
    metadata: JSON.stringify({ code: party.code, displayName, isHost })
  });

  return NextResponse.json({
    token: token.token,
    url,
    roomName,
    identity,
    expiresInSec: token.expiresInSec
  });
}
