import { prisma } from "@illuvrse/db";

export type SchedulerWindow = "24h" | "7d";

function windowHours(window: SchedulerWindow) {
  return window === "7d" ? 24 * 7 : 24;
}

export async function generateScheduleForChannel(channelId: string, window: SchedulerWindow) {
  const channel = await prisma.liveChannel.findUnique({ where: { id: channelId } });
  if (!channel) throw new Error("Channel not found");
  if (channel.scheduleLocked) {
    return { programsCreated: 0, channelsTouched: 0, skipped: true };
  }

  const now = new Date();
  const end = new Date(now.getTime() + windowHours(window) * 60 * 60 * 1000);

  if (!channel.isVirtual) {
    const existing = await prisma.liveProgram.count({
      where: { channelId: channel.id, startsAt: { gte: now, lt: end } }
    });
    if (existing > 0) return { programsCreated: 0, channelsTouched: 1, skipped: false };

    await prisma.liveProgram.create({
      data: {
        channelId: channel.id,
        title: `${channel.name} Live`,
        description: channel.description ?? "Live coverage",
        startsAt: now,
        endsAt: end
      }
    });
    return { programsCreated: 1, channelsTouched: 1, skipped: false };
  }

  const episodes = await prisma.episode.findMany({
    orderBy: { createdAt: "asc" }
  });
  if (episodes.length === 0) return { programsCreated: 0, channelsTouched: 1, skipped: false };

  const last = await prisma.liveProgram.findFirst({
    where: { channelId: channel.id },
    orderBy: { endsAt: "desc" }
  });
  let cursor = last?.endsAt ?? now;
  if (cursor < now) cursor = now;
  let order = last?.order ?? 0;
  let created = 0;
  let idx = 0;

  while (cursor < end) {
    const ep = episodes[idx % episodes.length];
    const durationMin = channel.defaultProgramDurationMin ?? Math.max(10, Math.round(ep.lengthSeconds / 60));
    const startsAt = cursor;
    const endsAt = new Date(startsAt.getTime() + durationMin * 60 * 1000);
    order += 1;
    await prisma.liveProgram.create({
      data: {
        channelId: channel.id,
        title: ep.title,
        description: ep.description,
        startsAt,
        endsAt,
        episodeId: ep.id,
        order
      }
    });
    created += 1;
    idx += 1;
    cursor = endsAt;
  }

  return { programsCreated: created, channelsTouched: 1, skipped: false };
}

export async function runScheduler(window: SchedulerWindow, triggeredById?: string) {
  const run = await prisma.schedulerRun.create({
    data: {
      scope: "LIVE",
      status: "RUNNING",
      triggeredById: triggeredById ?? null
    }
  });

  let channelsTouched = 0;
  let programsCreated = 0;
  let errors = 0;

  try {
    const channels = await prisma.liveChannel.findMany({
      where: { isActive: true }
    });

    for (const channel of channels) {
      try {
        const result = await generateScheduleForChannel(channel.id, window);
        channelsTouched += result.channelsTouched;
        programsCreated += result.programsCreated;
      } catch {
        errors += 1;
      }
    }

    const summary = `Window ${window}: created ${programsCreated} programs across ${channelsTouched} channels`;
    await prisma.schedulerRun.update({
      where: { id: run.id },
      data: {
        completedAt: new Date(),
        status: errors > 0 ? "PARTIAL" : "SUCCESS",
        channelsTouched,
        programsCreated,
        errors,
        summary
      }
    });

    return { runId: run.id, channelsTouched, programsCreated, errors, summary };
  } catch (error) {
    await prisma.schedulerRun.update({
      where: { id: run.id },
      data: {
        completedAt: new Date(),
        status: "FAILED",
        channelsTouched,
        programsCreated,
        errors: errors + 1,
        summary: error instanceof Error ? error.message : "Scheduler failed"
      }
    });
    throw error;
  }
}
