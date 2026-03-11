export const dynamic = "force-dynamic";

/**
 * Party playlist append API.
 * POST: { shortPostId, position } -> { ok: true, playlistLength }
 * Guard: host-only (authenticated principal).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { getState, publish, setState } from "@illuvrse/world-state";
import { AuthzError, requireSession } from "@/lib/authz";
import { checkRateLimit, resolveClientKey } from "@/lib/rateLimit";

const appendSchema = z.object({
  shortPostId: z.string().min(2),
  position: z.enum(["append", "next"]).optional()
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
    key: `party:playlist-append:${resolveClientKey(request, principal.userId)}`,
    windowMs: 60_000,
    limit: 60
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = appendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { code } = await params;

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

  const shortPost = await prisma.shortPost.findUnique({
    where: { id: parsed.data.shortPostId }
  });

  if (!shortPost) {
    return NextResponse.json({ error: "Short not found" }, { status: 404 });
  }

  const assetUrl = shortPost.mediaUrl;

  const [currentCount, maxOrderEntry] = await Promise.all([
    prisma.playlistItem.count({ where: { partyId: party.id } }),
    prisma.playlistItem.findFirst({
      where: { partyId: party.id },
      orderBy: { order: "desc" },
      select: { order: true }
    })
  ]);

  const maxOrder = maxOrderEntry?.order ?? -1;
  const nextOrderCandidate = Math.min(party.currentIndex + 1, maxOrder + 1);
  const insertOrder = parsed.data.position === "next" ? nextOrderCandidate : maxOrder + 1;

  if (parsed.data.position === "next") {
    await prisma.playlistItem.updateMany({
      where: { partyId: party.id, order: { gte: insertOrder } },
      data: { order: { increment: 1 } }
    });
  }

  await prisma.playlistItem.create({
    data: {
      partyId: party.id,
      episodeId: null,
      assetUrl,
      order: insertOrder
    }
  });

  const state = await getState(party.id, party.seats.length);
  await setState(party.id, state);

  const playlistLength = currentCount + 1;
  await publish(party.id, {
    type: "playlist_update",
    playlistLength,
    updatedAt: new Date().toISOString()
  });

  return NextResponse.json({ ok: true, playlistLength });
}
