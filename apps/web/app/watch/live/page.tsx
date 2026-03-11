/**
 * Live channels grid page.
 */
import { prisma } from "@illuvrse/db";
import LiveGrid from "./components/LiveGrid";

export default async function LivePage() {
  const channels = await prisma.liveChannel.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" }
  });

  const now = new Date();
  const programs = await prisma.liveProgram.findMany({
    where: {
      channelId: { in: channels.map((channel) => channel.id) },
      startsAt: { lte: now },
      endsAt: { gte: now }
    }
  });
  const programMap = new Map(programs.map((program) => [program.channelId, program.title]));

  return (
    <div className="-mx-6 space-y-8 bg-[#07070b] px-6 pb-10 text-white">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Live TV</p>
        <h1 className="text-3xl font-semibold">Live channels</h1>
        <p className="text-sm text-white/60">Always-on streams from the ILLUVRSE network.</p>
      </header>
      <LiveGrid
        channels={channels.map((channel) => ({
          id: channel.id,
          name: channel.name,
          logoUrl: channel.logoUrl,
          heroUrl: channel.heroUrl,
          category: channel.category,
          now: programMap.get(channel.id) ?? null
        }))}
      />
    </div>
  );
}
