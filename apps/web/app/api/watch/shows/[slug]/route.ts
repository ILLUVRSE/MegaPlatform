export const dynamic = "force-dynamic";

/**
 * Watch show detail API.
 * GET: -> { show, seasons, episodesBySeason }
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
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const show = await prisma.show.findUnique({
    where: { slug },
    include: {
      seasons: {
        orderBy: { number: "asc" },
        include: { episodes: { orderBy: { createdAt: "asc" } } }
      }
    }
  });

  if (!show) {
    return NextResponse.json({ error: "Show not found" }, { status: 404 });
  }

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
      isPremium: show.isPremium,
      maturityRating: show.maturityRating
    },
    {
      userId: session?.user?.id ?? null,
      role: session?.user?.role ?? null,
      isKidsProfile
    }
  );

  const episodesBySeason: Record<string, unknown> = {};
  show.seasons.forEach((season) => {
    episodesBySeason[season.id] = season.episodes.map((episode) => ({
      id: episode.id,
      title: episode.title,
      description: episode.description,
      lengthSeconds: episode.lengthSeconds,
      assetUrl: access.allowed ? episode.assetUrl : null
    }));
  });

  return NextResponse.json({
    show: {
      id: show.id,
      title: show.title,
      slug: show.slug,
      description: show.description,
      posterUrl: show.posterUrl,
      heroUrl: show.heroUrl,
      isPremium: show.isPremium,
      price: show.price,
      maturityRating: show.maturityRating
    },
    access,
    seasons: show.seasons.map((season) => ({
      id: season.id,
      number: season.number,
      title: season.title
    })),
    episodesBySeason
  });
}
