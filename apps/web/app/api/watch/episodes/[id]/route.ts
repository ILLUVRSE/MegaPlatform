export const dynamic = "force-dynamic";

/**
 * Watch episode API.
 * GET: -> { episode, show, season, nextEpisodes }
 * Guard: none.
 */
import { NextResponse } from "next/server";
import { prisma } from "@illuvrse/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProfileIdFromCookie } from "@/lib/watchProfiles";
import { canAccessShow } from "@/lib/watchEntitlements";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const episode = await prisma.episode.findUnique({
    where: { id },
    include: { season: { include: { show: true } } }
  });

  if (!episode) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }

  const nextEpisodes = await prisma.episode.findMany({
    where: { seasonId: episode.seasonId },
    orderBy: { createdAt: "asc" }
  });

  const session = await getServerSession(authOptions).catch(() => null);
  let isKidsProfile = false;
  if (session?.user?.id) {
    const profileId = getProfileIdFromCookie(request.headers.get("cookie"));
    if (profileId) {
      const profile = await prisma.profile.findFirst({
        where: { id: profileId, userId: session.user.id },
        select: { isKids: true }
      });
      isKidsProfile = profile?.isKids ?? false;
    }
  }
  const access = canAccessShow(
    {
      isPremium: episode.season.show.isPremium,
      maturityRating: episode.season.show.maturityRating
    },
    {
      userId: session?.user?.id ?? null,
      role: session?.user?.role ?? null,
      isKidsProfile
    }
  );

  return NextResponse.json({
    episode: {
      id: episode.id,
      title: episode.title,
      description: episode.description,
      lengthSeconds: episode.lengthSeconds,
      assetUrl: access.allowed ? episode.assetUrl : null
    },
    season: {
      id: episode.season.id,
      number: episode.season.number,
      title: episode.season.title
    },
    show: {
      id: episode.season.show.id,
      title: episode.season.show.title,
      slug: episode.season.show.slug,
      description: episode.season.show.description,
      posterUrl: episode.season.show.posterUrl,
      heroUrl: episode.season.show.heroUrl,
      isPremium: episode.season.show.isPremium,
      maturityRating: episode.season.show.maturityRating
    },
    access,
    nextEpisodes: nextEpisodes.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      lengthSeconds: item.lengthSeconds
    }))
  });
}
