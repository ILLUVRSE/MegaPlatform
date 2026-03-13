/**
 * Watch home page (streaming hub).
 * Request/response: renders hero carousel, rails, and live row.
 * Guard: none.
 */
import Link from "next/link";
import { prisma } from "@illuvrse/db";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import HeroCarousel from "./components/HeroCarousel";
import RailRow from "./components/RailRow";
import PosterCard from "./components/PosterCard";
import ChannelTile from "./components/ChannelTile";
import ContinueWatchingRail from "./components/ContinueWatchingRail";
import { PROFILE_COOKIE } from "@/lib/watchProfiles";
import { WATCH_LOCAL_NAV } from "@/lib/navigation";

export default async function WatchPage() {
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  const profileId = cookieStore.get(PROFILE_COOKIE)?.value ?? null;
  const shows = await prisma.show.findMany({
    orderBy: [{ watchOrder: "asc" }, { createdAt: "desc" }],
    include: { seasons: { include: { episodes: { orderBy: { createdAt: "asc" } } } } },
    take: 12
  });

  const sortedForHero = [...shows].sort((a, b) => {
    const aScore = a.heroPriority ?? Number.MAX_SAFE_INTEGER;
    const bScore = b.heroPriority ?? Number.MAX_SAFE_INTEGER;
    if (aScore !== bScore) return aScore - bScore;
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return 0;
  });
  const heroPool = sortedForHero.filter((item) => item.featured || item.heroPriority != null);
  const heroSource = (heroPool.length > 0 ? heroPool : sortedForHero).slice(0, 4);

  const heroShows = heroSource.map((show) => {
    const episode = show.seasons[0]?.episodes[0] ?? null;
    return {
      id: show.id,
      title: show.title,
      slug: show.slug,
      description: show.description,
      heroUrl: show.heroUrl,
      posterUrl: show.posterUrl,
      featuredEpisodeId: episode?.id ?? null
    };
  });

  const baseItems = shows.map((show) => ({
    id: show.id,
    title: show.title,
    slug: show.slug,
    posterUrl: show.posterUrl,
    heroUrl: show.heroUrl,
    description: show.description
  }));

  const byId = new Map(baseItems.map((item) => [item.id, item]));
  const trendingIds = shows.filter((item) => item.trending).map((item) => item.id);
  const newReleaseIds = shows.filter((item) => item.newRelease).map((item) => item.id);
  const rails: Array<{ id: string; title: string; items: typeof baseItems }> = [];

  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter(Boolean) as typeof baseItems;

  const trendingItems = pick(trendingIds).slice(0, 8);
  rails.push({
    id: "trending",
    title: "Trending",
    items: trendingItems.length > 0 ? trendingItems : baseItems.slice(0, 8)
  });

  const newReleaseItems = pick(newReleaseIds).slice(0, 8);
  rails.push({
    id: "new-releases",
    title: "New Releases",
    items: newReleaseItems.length > 0 ? newReleaseItems : baseItems.slice(2, 10)
  });

  const featuredRailMap = new Map<string, typeof baseItems>();
  for (const show of shows) {
    if (!show.featuredRail) continue;
    const list = featuredRailMap.get(show.featuredRail) ?? [];
    const card = byId.get(show.id);
    if (card) list.push(card);
    featuredRailMap.set(show.featuredRail, list);
  }

  const orderedRailKeys = [...featuredRailMap.keys()].sort((a, b) => {
    const aOrder = shows.find((item) => item.featuredRail === a)?.featuredRailOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = shows.find((item) => item.featuredRail === b)?.featuredRailOrder ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });

  for (const key of orderedRailKeys) {
    const items = (featuredRailMap.get(key) ?? []).slice(0, 12);
    if (items.length === 0) continue;
    rails.push({
      id: `featured-rail-${key.toLowerCase()}`,
      title: key.replaceAll("_", " "),
      items
    });
  }

  const genreRails = ["Action", "Comedy", "Sci-Fi", "Kids"].map((genre) => ({
    id: genre.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-"),
    title: genre,
    items: shows
      .filter((show) => (show.genres ?? []).some((item) => item.toLowerCase() === genre.toLowerCase()))
      .map((show) => byId.get(show.id))
      .filter(Boolean) as typeof baseItems
  }));
  for (const rail of genreRails) {
    if (rail.items.length > 0) rails.push(rail);
  }

  const now = new Date();
  const channels = await prisma.liveChannel.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" }
  });
  const programs = await prisma.liveProgram.findMany({
    where: {
      channelId: { in: channels.map((channel) => channel.id) },
      startsAt: { lte: now },
      endsAt: { gte: now }
    }
  });
  const programMap = new Map(
    programs.map((program) => [program.channelId, typeof program.title === "string" ? program.title : null])
  );

  let myListItems: Array<{ id: string; title: string; slug: string; posterUrl?: string | null }> = [];
  let myListIds = new Set<string>();
  let progressItems: Array<{
    id: string;
    showTitle: string;
    episodeTitle: string;
    posterUrl?: string | null;
  }> = [];

  if (session?.user?.id && profileId) {
    const profile = await prisma.profile.findFirst({
      where: { id: profileId, userId: session.user.id }
    });

    if (profile) {
      const list = await prisma.myListItem.findMany({ where: { profileId: profile.id } });
      const showIds = list.map((item) => item.showId).filter(Boolean) as string[];
      const listShows = await prisma.show.findMany({ where: { id: { in: showIds } } });
      myListItems = listShows.map((show) => ({
        id: show.id,
        title: show.title,
        slug: show.slug,
        posterUrl: show.posterUrl
      }));
      myListIds = new Set(listShows.map((show) => show.id));

      const progress = await prisma.watchProgress.findMany({
        where: { profileId: profile.id },
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: { episode: { include: { season: { include: { show: true } } } } }
      });
      progressItems = progress.map((item) => ({
        id: item.episode.id,
        showTitle: item.episode.season.show.title,
        episodeTitle: item.episode.title,
        posterUrl: item.episode.season.show.posterUrl
      }));
    }
  }

  const recommendationItems = rails.flatMap((rail) => rail.items).slice(0, 4);

  return (
    <div className="space-y-8 text-white">
      <HeroCarousel items={heroShows} />

      <div className="flex flex-wrap gap-2">
        {WATCH_LOCAL_NAV.map((item) => {
          if (item.requiresProfilePrompt && !(session?.user?.id && !profileId)) return null;
          const active = item.href === "/watch";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`interactive-focus rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] ${
                active
                  ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
                  : "border-white/10 bg-white/5 text-white/82 hover:text-white"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
        <div className="space-y-8">
          {session?.user?.id && profileId ? (
            progressItems.length > 0 ? (
              <RailRow title="For You">
                {progressItems.map((item) => (
                  <PosterCard
                    key={item.id}
                    title={item.showTitle}
                    subtitle={item.episodeTitle}
                    imageUrl={item.posterUrl}
                    href={`/watch/episode/${item.id}`}
                  />
                ))}
              </RailRow>
            ) : null
          ) : (
            <ContinueWatchingRail />
          )}

          {rails.map((rail) => (
            <RailRow key={rail.id} title={rail.title}>
              {rail.items.map((item) => (
                <PosterCard
                  key={item.id}
                  title={item.title}
                  imageUrl={item.posterUrl}
                  href={`/watch/show/${item.slug}`}
                  showId={item.id}
                  canSave={Boolean(session?.user?.id && profileId)}
                  initialSaved={myListIds.has(item.id)}
                />
              ))}
            </RailRow>
          ))}

          {session?.user?.id && profileId && myListItems.length > 0 ? (
            <RailRow title="My List">
              {myListItems.map((item) => (
                <PosterCard
                  key={item.id}
                  title={item.title}
                  imageUrl={item.posterUrl}
                  href={`/watch/show/${item.slug}`}
                />
              ))}
            </RailRow>
          ) : null}
        </div>

        <aside className="space-y-4">
          <section className="platform-panel-dark">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">Up next</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Recommendations</h2>
              </div>
              <Link href="/watch/live" className="interactive-focus text-xs font-semibold uppercase tracking-[0.26em] text-cyan-100">
                Live
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {recommendationItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/watch/show/${item.slug}`}
                  className="interactive-focus flex gap-3 rounded-[22px] border border-white/10 bg-white/5 p-3"
                >
                  <img
                    src={item.posterUrl ?? "https://placehold.co/280x160?text=ILLUVRSE"}
                    alt={item.title}
                    className="h-20 w-16 rounded-xl object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-white/78">Queue this next in Watch or Party.</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="platform-panel-dark">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">Friends watching</p>
            <div className="mt-4 space-y-3">
              {["Ryan", "Alex", "Jamie"].map((name, index) => (
                <div key={name} className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/5 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-cyan-400/90 to-fuchsia-500/80" />
                    <div>
                      <p className="text-sm font-semibold text-white">{name}</p>
                      <p className="text-xs text-white/76">{index === 0 ? "Nebula Nights" : index === 1 ? "Trending shorts" : "Live recap"}</p>
                    </div>
                  </div>
                  <Link href="/party" className="interactive-focus text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
                    Join
                  </Link>
                </div>
              ))}
            </div>
          </section>

          <section className="platform-panel-dark">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">Live now</p>
            <div className="mt-4 space-y-3">
              {channels.slice(0, 4).map((channel) => (
                <ChannelTile
                  key={channel.id}
                  channel={{
                    id: channel.id,
                    name: channel.name,
                    logoUrl: channel.logoUrl,
                    heroUrl: channel.heroUrl,
                    category: typeof channel.category === "string" ? channel.category : null,
                    now: (programMap.get(channel.id) as string | null | undefined) ?? null
                  }}
                />
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
