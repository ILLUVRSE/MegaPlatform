"use client";

import Link from "next/link";
import { PLATFORM_HUB_MODULES } from "@/lib/platformApps";
import { GAMES } from "@/src/domains/creator/games/catalog";

type HomeWallProps = {
  isAdmin?: boolean;
  overview?: {
    sessionGraph: {
      currentModule: string;
      activeTask?: string | null;
      trail: Array<{ module: string; href: string; at: string; action?: string }>;
    };
    inbox: Array<{
      id: string;
      title: string;
      body?: string | null;
      href: string;
      actionLabel?: string | null;
      status: string;
    }>;
    squad: {
      name: string;
      memberCount: number;
      inviteCount: number;
    } | null;
    economy: {
      balance: number;
      entitlements: Array<{ key: string; status: string }>;
    };
    recommendations: {
      continueWatching: Array<{ id: string; title: string; href: string }>;
      forYourSquad: Array<{ id: string; title: string; href: string }>;
      creatorNext: Array<{ id: string; title: string; href: string }>;
    };
  };
};

export default function HomeWall({ isAdmin = false, overview }: HomeWallProps) {
  const forYou = overview?.recommendations.continueWatching ?? [];
  const trendingShorts = overview?.recommendations.creatorNext ?? [];
  const liveNow = [
    { title: "Nebula Nights aftershow", href: "/watch/live", meta: "24.8k watching" },
    { title: "GameGrid challenge room", href: "/gamegrid", meta: "Live session" },
    { title: "Party lobby pulse", href: "/party", meta: "3 invites waiting" }
  ];
  const creators = [
    { name: "Ryan", label: "Watch host" },
    { name: "Alex", label: "Arcade builder" },
    { name: "Jamie", label: "Shorts editor" }
  ];
  const livePlatform = [
    { value: `${overview?.inbox.length ?? 3}`, label: "new events" },
    { value: `${overview?.squad?.memberCount ?? 3}`, label: "squad online" },
    { value: isAdmin ? "2" : "1", label: "live rooms" }
  ];

  return (
    <div className="space-y-6" data-testid="home-wall">
      <section className="platform-hero text-white">
        <div className="relative grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-5">
            <span className="platform-chip">Now streaming</span>
            <div>
              <h1 className="max-w-2xl text-4xl font-semibold md:text-5xl">Nebula Nights</h1>
              <p className="mt-3 max-w-2xl text-base text-white/70">
                The front page now opens like a streaming destination: one hero title, then rails for what to watch, play, remix, and join with friends.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/watch" className="rounded-full bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-950">
                Watch now
              </Link>
              <Link href="/party" className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100">
                Join party
              </Link>
              <Link href="/studio" className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-white">
                Open studio
              </Link>
            </div>
          </div>

          <div className="self-end rounded-[30px] border border-[#7fffd4]/16 bg-[#071313]/38 p-5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="platform-live-dot" />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#7fffd4]/82">Live platform</p>
                <p className="mt-1 text-sm text-white/58">What changed since you last checked in.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {livePlatform.map((item) => (
                <div key={item.label} className="rounded-[24px] border border-white/8 bg-white/5 p-4">
                  <p className="text-3xl font-semibold text-white">{item.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.24em] text-white/48">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="platform-section">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/45">For you</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">Keep the feed cinematic</h2>
        </div>
        <div className="platform-scroll-row no-scrollbar">
          {(forYou.length > 0
            ? forYou
            : PLATFORM_HUB_MODULES.slice(0, 4).map((module) => ({ id: module.href, title: module.name, href: module.href }))).map((item) => (
            <Link key={item.id} href={item.href} className="platform-tile block min-w-[280px] p-4 text-white">
              <div className="mb-4 h-40 rounded-[22px] bg-[linear-gradient(135deg,rgba(34,211,238,0.3),rgba(2,6,23,0.45),rgba(217,70,239,0.24))]" />
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/58">For you</p>
              <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-white/56">Resume content, parties, and creator flows without breaking context.</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="platform-section">
        <p className="text-xs uppercase tracking-[0.3em] text-white/45">Trending shorts</p>
        <div className="platform-scroll-row no-scrollbar">
          {(trendingShorts.length > 0
            ? trendingShorts
            : PLATFORM_HUB_MODULES.slice(1, 5).map((module) => ({ id: module.href, title: module.name, href: module.href }))).map((item, index) => (
            <Link key={item.id} href={item.href} className="platform-tile block min-w-[220px] p-3 text-white">
              <div className="aspect-[9/16] rounded-[24px] bg-[linear-gradient(180deg,rgba(15,23,42,0.2),rgba(2,6,23,0.78)),radial-gradient(circle_at_top,rgba(244,114,182,0.22),transparent_34%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.24),transparent_26%)]" />
              <div className="mt-3">
                <p className="text-xs uppercase tracking-[0.28em] text-white/45">Short {index + 1}</p>
                <h3 className="mt-1 text-base font-semibold">{item.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="platform-section">
          <p className="text-xs uppercase tracking-[0.3em] text-white/45">Live now</p>
          <div className="grid gap-4 md:grid-cols-3">
            {liveNow.map((item) => (
              <Link key={item.title} href={item.href} className="platform-tile block p-4 text-white">
                <div className="mb-4 h-32 rounded-[22px] bg-[linear-gradient(135deg,rgba(34,211,238,0.15),rgba(30,41,59,0.35),rgba(248,113,113,0.14))]" />
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-white/56">{item.meta}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="platform-section">
          <p className="text-xs uppercase tracking-[0.3em] text-white/45">Creators</p>
          <div className="space-y-3">
            {creators.map((creator) => (
              <div key={creator.name} className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
                <div className="relative h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-400/90 to-fuchsia-500/90">
                  <span className="platform-live-dot absolute -bottom-1 -right-1 border-2 border-[#0a1a1a]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{creator.name}</p>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/48">{creator.label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="platform-section">
        <p className="text-xs uppercase tracking-[0.3em] text-white/45">Popular games</p>
        <div className="grid gap-4 md:grid-cols-3">
          {GAMES.map((game, index) => (
            <Link key={game.slug} href={`/games/${game.slug}`} className="platform-tile block p-4 text-white">
              <img src={game.cover} alt={game.title} className="h-40 w-full rounded-[22px] object-cover" />
              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{game.title}</h3>
                  <p className="mt-2 text-sm text-white/56">{index === 0 ? "12k playing" : index === 1 ? "8.4k playing" : "5.9k playing"}</p>
                </div>
                <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
                  4.{8 - index}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
