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
import { getLivePremiereStatus } from "@/lib/livePremiere";
import { getProfileIdFromCookie } from "@/lib/watchProfiles";
import { evaluateReleaseSchedule, getEarliestUpcomingRelease } from "@/lib/releaseScheduling";
import { listPublishedShowExtrasForWatchByProjectSlug } from "@/lib/showExtras";
import { canAccessShow } from "@/lib/watchEntitlements";
import { listWatchChapterMarkersByEpisode } from "@/lib/watchChapterMarkers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const now = new Date();
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

  const extras = await listPublishedShowExtrasForWatchByProjectSlug(show.slug, now);

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

  const chapterMarkersByEpisode = await listWatchChapterMarkersByEpisode(
    show.slug,
    show.seasons.flatMap((season) =>
      season.episodes
        .filter((episode) => {
          const releaseState = evaluateReleaseSchedule(episode, now);
          const premiereState = getLivePremiereStatus(episode, now);
          return releaseState.isReleased || premiereState.isPremiereEnabled;
        })
        .map((episode, index) => ({
          id: episode.id,
          title: episode.title,
          seasonNumber: season.number,
          episodeNumber: index + 1
        }))
    )
  );

  const episodesBySeason: Record<string, unknown> = {};
  show.seasons.forEach((season) => {
    episodesBySeason[season.id] = season.episodes
      .filter((episode) => {
        const releaseState = evaluateReleaseSchedule(episode, now);
        const premiereState = getLivePremiereStatus(episode, now);
        return releaseState.isReleased || premiereState.isPremiereEnabled;
      })
      .map((episode) => {
        const premiereState = getLivePremiereStatus(episode, now);

        return {
          id: episode.id,
          title: episode.title,
          description: episode.description,
          lengthSeconds: episode.lengthSeconds,
          assetUrl: access.allowed && premiereState.state === "VOD" ? episode.assetUrl : null,
          chapterMarkers: premiereState.state === "VOD" ? chapterMarkersByEpisode[episode.id] ?? [] : [],
          premiere: {
            state: premiereState.state,
            isPremiereEnabled: premiereState.isPremiereEnabled,
            startsAt: premiereState.startsAt?.toISOString() ?? null,
            effectiveEndsAt: premiereState.effectiveEndsAt?.toISOString() ?? null,
            chatEnabled: premiereState.chatEnabled
          }
        };
      });
  });

  const showRelease = evaluateReleaseSchedule(show, now);
  const comingSoonAt =
    getEarliestUpcomingRelease(
      show.seasons.flatMap((season) => season.episodes),
      now
    ) ?? (showRelease.isComingSoon ? showRelease.releaseAt : null);

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
    comingSoonAt: comingSoonAt?.toISOString() ?? null,
    seasons: show.seasons.map((season) => ({
      id: season.id,
      number: season.number,
      title: season.title
    })),
    episodesBySeason,
    extras: extras.map((extra) => ({
      id: extra.id,
      type: extra.type,
      title: extra.title,
      description: extra.description,
      assetUrl: access.allowed ? extra.assetUrl : null,
      runtimeSeconds: extra.runtimeSeconds
    }))
  });
}
