export const dynamic = "force-dynamic";

/**
 * Party creation API.
 * POST: { name, seatCount, isPublic } -> { code, partyId, hostId }
 * Guard: authenticated.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { setState, type PartyState } from "@illuvrse/world-state";
import { AuthzError, requireSession } from "@/lib/authz";
import { checkRateLimit, resolveClientKey } from "@/lib/rateLimit";

const createSchema = z.object({
  name: z.string().min(2).max(80),
  seatCount: z.number().min(6).max(24),
  isPublic: z.boolean().default(true),
  episodeId: z.string().min(2).optional()
});

const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateCode() {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

async function createUniqueCode() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generateCode();
    const existing = await prisma.party.findUnique({ where: { code } });
    if (!existing) return code;
  }
  return null;
}

export async function POST(request: Request) {
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
    key: `party:create:${resolveClientKey(request, principal.userId)}`,
    windowMs: 60_000,
    limit: 10
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const code = await createUniqueCode();
  if (!code) {
    return NextResponse.json({ error: "Unable to generate party code" }, { status: 500 });
  }

  const watchEpisode = parsed.data.episodeId
    ? await prisma.episode.findUnique({
        where: { id: parsed.data.episodeId },
        select: { id: true, assetUrl: true }
      })
    : null;

  if (parsed.data.episodeId && !watchEpisode) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }

  const party = await prisma.party.create({
    data: {
      code,
      name: parsed.data.name,
      isPublic: parsed.data.isPublic,
      hostId: principal.userId,
      playlist:
        watchEpisode
          ? {
              create: [
                {
                  order: 0,
                  episodeId: watchEpisode.id,
                  assetUrl: watchEpisode.assetUrl
                }
              ]
            }
          : undefined,
      seats: {
        create: Array.from({ length: parsed.data.seatCount }, (_, idx) => ({
          seatIndex: idx + 1
        }))
      }
    },
    include: {
      playlist: true
    }
  });

  await prisma.participant.create({
    data: {
      partyId: party.id,
      userId: principal.userId,
      displayName: "Host"
    }
  });

  const initialState: PartyState = {
    partyId: party.id,
    seatCount: parsed.data.seatCount,
    seats: {},
    playback: {
      currentIndex: party.currentIndex,
      playbackState: party.playbackState as PartyState["playback"]["playbackState"],
      leaderId: principal.userId,
      timelineRevision: 0,
      syncSequence: 0,
      lastAction: "heartbeat",
      lastHeartbeatAt: Date.now()
    },
    participants: {
      [principal.userId]: {
        displayName: "Host",
        joinedAt: new Date().toISOString()
      }
    },
    heartbeat: {
      lastSeenAt: new Date().toISOString(),
      lastHostHeartbeatAt: new Date().toISOString(),
      pingCount: 1
    },
    updatedAt: new Date().toISOString()
  };

  await setState(party.id, initialState);

  return NextResponse.json({ code: party.code, partyId: party.id, hostId: principal.userId });
}
