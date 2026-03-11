export const dynamic = "force-dynamic";

/**
 * Party playlist API.
 * GET: -> { items: [{ id, order, episode: { id, title, assetUrl } }] }
 * PUT: { items: [{ episodeId, order }] } -> { count }
 * Guard: host-only for PUT (authenticated principal).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@illuvrse/db";
import { getState, publish, setState } from "@illuvrse/world-state";
import { AuthzError, requireSession } from "@/lib/authz";

const playlistSchema = z.object({
  items: z.array(
    z.object({
      episodeId: z.string().min(2).optional(),
      assetUrl: z.string().url().optional(),
      title: z.string().optional(),
      order: z.number().int().min(0)
    })
  )
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const party = await prisma.party.findUnique({ where: { code } });
  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  const items = await prisma.playlistItem.findMany({
    where: { partyId: party.id },
    orderBy: { order: "asc" },
    include: {
      episode: { select: { id: true, title: true, assetUrl: true } }
    }
  });

  return NextResponse.json({ items });
}

export async function PUT(
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

  const { code } = await params;
  const body = await request.json();
  const parsed = playlistSchema.safeParse(body);
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

  const episodeIds = parsed.data.items
    .map((item) => item.episodeId)
    .filter((value): value is string => Boolean(value));
  const episodes = await prisma.episode.findMany({
    where: { id: { in: episodeIds } },
    select: { id: true, assetUrl: true }
  });

  const assetLookup = new Map(episodes.map((episode) => [episode.id, episode.assetUrl]));

  await prisma.playlistItem.deleteMany({ where: { partyId: party.id } });

  if (parsed.data.items.length > 0) {
    await prisma.playlistItem.createMany({
      data: parsed.data.items.map((item) => ({
        partyId: party.id,
        episodeId: item.episodeId ?? null,
        assetUrl: item.episodeId ? assetLookup.get(item.episodeId) ?? "" : item.assetUrl ?? "",
        order: item.order
      }))
    });
  }

  const state = await getState(party.id, party.seats.length);
  await setState(party.id, state);

  await publish(party.id, {
    type: "playlist_update",
    playlistLength: parsed.data.items.length,
    updatedAt: new Date().toISOString()
  });

  return NextResponse.json({ count: parsed.data.items.length });
}
