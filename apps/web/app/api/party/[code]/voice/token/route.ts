export const dynamic = "force-dynamic";

/**
 * Party voice token API.
 * POST: -> token payload or graceful token-only fallback payload
 * Guard: authenticated participant/host only.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { AuthzError, requireSession } from "@/lib/authz";
import { checkRateLimit, resolveClientKey } from "@/lib/rateLimit";
import { createLiveKitAccessToken, getLiveKitServerConfig, isLiveKitConfigured } from "@/lib/livekitToken";
import { insertPlatformEvent, PLATFORM_EVENT_NAMES } from "@/lib/platformEvents";
import type { PartyVoiceTokenResponse } from "@/lib/partyVoice";

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
    limit: 12
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests", retryAfterSec: rateLimit.retryAfterSec },
      { status: 429 }
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
  if (!isLiveKitConfigured()) {
    return NextResponse.json<PartyVoiceTokenResponse>({
      mode: "token-only",
      fallback: true,
      reason: "livekit_not_configured",
      roomName,
      identity
    });
  }

  try {
    const { apiKey, apiSecret, url } = getLiveKitServerConfig();
    const token = createLiveKitAccessToken({
      apiKey,
      apiSecret,
      identity,
      roomName,
      metadata: JSON.stringify({ code: party.code, displayName, isHost })
    });

    await insertPlatformEvent({
      event: PLATFORM_EVENT_NAMES.partyVoiceTokenIssued,
      module: `Party:${party.code}`,
      href: `/party/${party.code}`,
      surface: "party_voice"
    });

    return NextResponse.json<PartyVoiceTokenResponse>({
      mode: "token",
      fallback: false,
      token: token.token,
      url,
      roomName,
      identity,
      expiresInSec: token.expiresInSec
    });
  } catch {
    return NextResponse.json<PartyVoiceTokenResponse>({
      mode: "token-only",
      fallback: true,
      reason: "token_issue_failed",
      roomName,
      identity
    });
  }
}
