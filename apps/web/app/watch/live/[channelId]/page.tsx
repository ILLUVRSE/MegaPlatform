/**
 * Live channel playback page.
 */
import { notFound } from "next/navigation";
import { prisma } from "@illuvrse/db";
import VideoPlayer from "@/components/VideoPlayer";
import ChannelTile from "../../components/ChannelTile";
import { computeNowNext } from "@/lib/liveEpg";
import { computeLiveChannelHealth } from "@/lib/watchHealth";

export default async function LiveChannelPage({ params }: { params: Promise<{ channelId: string }> }) {
  const { channelId } = await params;
  const channel = await prisma.liveChannel.findUnique({
    where: { id: channelId }
  });

  if (!channel) {
    notFound();
  }

  const now = new Date();
  const candidatePrograms = await prisma.liveProgram.findMany({
    where: {
      channelId: channel.id,
      endsAt: { gt: now }
    },
    orderBy: { startsAt: "asc" },
    include: { episode: true }
  });
  const { now: nowProgram, next: nextProgram } = computeNowNext(candidatePrograms, now);
  const health = computeLiveChannelHealth({
    isActive: channel.isActive,
    streamUrl: channel.streamUrl ?? null,
    lastCheckedAt: channel.lastCheckedAt ?? null,
    lastHealthyAt: channel.lastHealthyAt ?? null
  });

  const moreChannels = await prisma.liveChannel.findMany({
    where: { isActive: true, NOT: { id: channel.id } },
    take: 6
  });

  let playerSrc = channel.streamUrl ?? "";
  let initialTimeSec: number | undefined;

  if (nowProgram?.streamUrl) {
    playerSrc = nowProgram.streamUrl;
  }

  if ((!playerSrc || playerSrc.length === 0) && channel.isVirtual && nowProgram?.episode) {
    playerSrc = nowProgram.episode.assetUrl;
    const offsetMs = now.getTime() - nowProgram.startsAt.getTime();
    initialTimeSec = Math.max(0, Math.floor(offsetMs / 1000));
  }

  return (
    <div className="-mx-6 space-y-8 bg-[#07070b] px-6 pb-10 text-white">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <img
            src={channel.logoUrl ?? "https://placehold.co/80x80?text=TV"}
            alt=""
            className="h-14 w-14 rounded-2xl object-cover"
          />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Live Channel</p>
            <h1 className="text-2xl font-semibold">{channel.name}</h1>
            <p className="text-sm text-white/60">{channel.description}</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {playerSrc ? (
          <VideoPlayer src={playerSrc} controls autoPlay muted initialTimeSec={initialTimeSec} />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-sm text-white/60">
            Stream offline.
          </div>
        )}
        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Now / Next</h2>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-red-300/40 bg-red-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-red-100">
                Live
              </span>
              {health.status === "degraded" ? (
                <span className="rounded-full border border-amber-300/40 bg-amber-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-100">
                  Degraded
                </span>
              ) : null}
            </div>
          </div>
          {health.status === "degraded" ? (
            <p className="text-xs text-amber-100/90">
              Stream health is stale ({health.staleMinutes}m since last healthy signal). Playback may be unstable.
            </p>
          ) : null}
          {nowProgram ? (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Now</p>
              <p className="text-sm font-semibold">{nowProgram.title}</p>
              {nowProgram.episode ? (
                <p className="text-xs text-white/70">{nowProgram.episode.title}</p>
              ) : null}
              <p className="text-xs text-white/60">{nowProgram.description}</p>
            </div>
          ) : (
            <p className="text-sm text-white/60">No program info.</p>
          )}
          {nextProgram ? (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Next</p>
              <p className="text-sm font-semibold">{nextProgram.title}</p>
              <p className="text-xs text-white/60">{nextProgram.description}</p>
            </div>
          ) : null}
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">More channels</h2>
        </div>
        <div className="no-scrollbar flex gap-4 overflow-x-auto pb-3">
          {moreChannels.map((item) => (
            <ChannelTile key={item.id} channel={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
