export const dynamic = "force-dynamic";

/**
 * Watch live channels API.
 * GET: -> { channels }
 * Guard: none.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { computeNowNext } from "@/lib/liveEpg";
import { computeLiveChannelHealth } from "@/lib/watchHealth";

export async function GET() {
  const channels = await prisma.liveChannel.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" }
  });

  const now = new Date();
  const programs = await prisma.liveProgram.findMany({
    where: {
      channelId: { in: channels.map((channel) => channel.id) },
      endsAt: { gt: now }
    },
    orderBy: { startsAt: "asc" }
  });
  const programsByChannel = new Map<string, typeof programs>();
  for (const program of programs) {
    const list = programsByChannel.get(program.channelId) ?? [];
    list.push(program);
    programsByChannel.set(program.channelId, list);
  }

  return NextResponse.json({
    channels: channels.map((channel) => ({
      ...channel,
      streamUrl: channel.streamUrl ?? null,
      health: computeLiveChannelHealth({
        isActive: channel.isActive,
        streamUrl: channel.streamUrl ?? null,
        lastCheckedAt: channel.lastCheckedAt ?? null,
        lastHealthyAt: channel.lastHealthyAt ?? null
      }),
      ...computeNowNext(programsByChannel.get(channel.id) ?? [], now)
    }))
  });
}
