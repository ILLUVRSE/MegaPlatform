export const dynamic = "force-dynamic";

/**
 * Watch featured API.
 * GET: -> { heroShows, rails }
 * Guard: none.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";

export async function GET() {
  const shows = await prisma.show.findMany({
    orderBy: { createdAt: "desc" },
    include: { seasons: { include: { episodes: { orderBy: { createdAt: "asc" } } } } },
    take: 12
  });

  const heroShows = shows.slice(0, 4).map((show) => {
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
