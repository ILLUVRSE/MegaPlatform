import type { PrismaClient } from "@prisma/client";

const HOURS_AHEAD = 24;

export type SchedulerProgram = {
  id: string;
  startsAt: Date;
  endsAt: Date;
};

export function computeNowNext(programs: SchedulerProgram[], now: Date) {
  const sorted = [...programs].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  return {
    now: sorted.find((program) => program.startsAt <= now && program.endsAt > now) ?? null,
    next: sorted.find((program) => program.startsAt > now) ?? null
  };
}

export async function generateSchedules(prisma: PrismaClient, now = new Date()) {
  const channels = await prisma.liveChannel.findMany({
    where: { isActive: true, isVirtual: true }
  });

  const episodes = await prisma.episode.findMany({
    orderBy: { createdAt: "asc" }
  });

  for (const channel of channels) {
    if (episodes.length === 0) continue;

    const windowEnd = new Date(now.getTime() + HOURS_AHEAD * 60 * 60 * 1000);

    const lastProgram = await prisma.liveProgram.findFirst({
      where: { channelId: channel.id },
      orderBy: { endsAt: "desc" }
    });

    let cursor = lastProgram?.endsAt ?? now;
    if (cursor < now) cursor = now;

    let order = lastProgram?.order ?? 0;
    let episodeIndex = 0;

    while (cursor < windowEnd) {
      const episode = episodes[episodeIndex % episodes.length];
      const durationMin = channel.defaultProgramDurationMin ?? Math.max(10, Math.round(episode.lengthSeconds / 60));
      const start = cursor;
      const end = new Date(start.getTime() + durationMin * 60 * 1000);

      order += 1;
      await prisma.liveProgram.create({
        data: {
          channelId: channel.id,
          title: episode.title,
          description: episode.description,
          startsAt: start,
          endsAt: end,
          episodeId: episode.id,
          order
        }
      });

      cursor = end;
      episodeIndex += 1;
    }
  }
}
