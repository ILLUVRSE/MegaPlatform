export const dynamic = "force-dynamic";

/**
 * Watch featured API.
 * GET: -> { heroShows, rails }
 * Guard: none.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { evaluateReleaseSchedule, getEarliestUpcomingRelease } from "@/lib/releaseScheduling";
import { withTracedRoute } from "@/lib/traceMiddleware";

export async function GET(request: Request) {
  return withTracedRoute(
    request,
    {
      name: "http.request.watch.featured",
      attributes: {
        "illuvrse.flow": "watch.featured"
      }
    },
    async () => {
      const now = new Date();
      const shows = await prisma.show.findMany({
        orderBy: { createdAt: "desc" },
        include: { seasons: { include: { episodes: { orderBy: { createdAt: "asc" } } } } },
        take: 12
      });

      const heroShows = shows.slice(0, 4).map((show) => {
        const allEpisodes = show.seasons.flatMap((season) => season.episodes);
        const episode = allEpisodes.find((item) => evaluateReleaseSchedule(item, now).isReleased) ?? null;
        const showRelease = evaluateReleaseSchedule(show, now);
        const upcomingReleaseAt =
          episode === null
            ? getEarliestUpcomingRelease(allEpisodes, now) ?? (showRelease.isComingSoon ? showRelease.releaseAt : null)
            : null;
        return {
          id: show.id,
          title: show.title,
          slug: show.slug,
          description: show.description,
          heroUrl: show.heroUrl,
          posterUrl: show.posterUrl,
          featuredEpisodeId: episode?.id ?? null,
          comingSoonAt: upcomingReleaseAt?.toISOString() ?? null
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

      const rails = [
        { id: "trending", title: "Trending", items: baseItems.slice(0, 8) },
        { id: "new", title: "New Releases", items: baseItems.slice(2, 10) },
        { id: "action", title: "Action", items: baseItems.slice(0, 6) },
        { id: "comedy", title: "Comedy", items: baseItems.slice(1, 7) },
        { id: "sci-fi", title: "Sci-Fi", items: baseItems.filter((item) => item.title.includes("Nebula")) },
        { id: "kids", title: "Kids", items: baseItems.filter((item) => item.title.includes("Tidal")) }
      ];

      return NextResponse.json({ heroShows, rails });
    }
  );
}
