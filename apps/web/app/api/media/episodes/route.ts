export const dynamic = "force-dynamic";

/**
 * Media episode search API.
 * GET: ?query= -> { data: [{ id, title, assetUrl, showTitle, seasonNumber }] }
 * Guard: none; public search.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();

  const where = query
    ? {
        OR: [{ title: { contains: query, mode: "insensitive" as const } }]
      }
    : undefined;

  const episodes = (await prisma.episode.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      title: true,
      assetUrl: true,
      season: {
        select: {
          number: true,
          show: { select: { title: true } }
        }
      }
    }
  })) as Array<{ id: string; title: string; assetUrl: string; season: { number: number; show: { title: string } } }>;

  const data = episodes.map((episode) => ({
    id: episode.id,
    title: episode.title,
    assetUrl: episode.assetUrl,
    showTitle: episode.season.show.title,
    seasonNumber: episode.season.number
  }));

  return NextResponse.json({ data });
}
