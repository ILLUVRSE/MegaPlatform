export const dynamic = "force-dynamic";

/**
 * Watch live channel detail API.
 * GET: -> { channel, nowNext }
 * Guard: none.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { computeNowNext } from "@/lib/liveEpg";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const channel = await prisma.liveChannel.findUnique({
    where: { id }
  });

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const now = new Date();
  const futurePrograms = await prisma.liveProgram.findMany({
    where: {
      channelId: channel.id,
      endsAt: { gt: now }
    },
    orderBy: { startsAt: "asc" },
    include: { episode: true }
  });
  const { now: nowProgram, next: nextProgram } = computeNowNext(futurePrograms, now);

  const upcoming = await prisma.liveProgram.findMany({
    where: { channelId: channel.id, startsAt: { gt: now } },
    orderBy: { startsAt: "asc" },
    take: 6
  });

  return NextResponse.json({
    channel: {
      id: channel.id,
      slug: channel.slug,
      name: channel.name,
      description: channel.description,
      logoUrl: channel.logoUrl,
      heroUrl: channel.heroUrl,
      category: channel.category,
      streamUrl: channel.streamUrl ?? null,
      isVirtual: channel.isVirtual
    },
    now: nowProgram
      ? {
          id: nowProgram.id,
          title: nowProgram.title,
          description: nowProgram.description,
          startsAt: nowProgram.startsAt,
          endsAt: nowProgram.endsAt,
          episodeId: nowProgram.episodeId ?? null,
          streamUrl: nowProgram.streamUrl ?? null
        }
      : null,
    next: nextProgram
      ? {
          id: nextProgram.id,
          title: nextProgram.title,
          description: nextProgram.description,
          startsAt: nextProgram.startsAt,
          endsAt: nextProgram.endsAt,
          episodeId: nextProgram.episodeId ?? null,
          streamUrl: nextProgram.streamUrl ?? null
        }
      : null,
    upcoming: upcoming.map((program) => ({
      id: program.id,
      title: program.title,
      description: program.description,
      startsAt: program.startsAt,
      endsAt: program.endsAt
    }))
  });
}
