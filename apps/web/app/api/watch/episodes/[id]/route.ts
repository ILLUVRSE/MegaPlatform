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
import { canAccessPremiereEpisodePage, getLivePremiereStatus } from "@/lib/livePremiere";
import { getProfileIdFromCookie } from "@/lib/watchProfiles";
import { evaluateReleaseSchedule } from "@/lib/releaseScheduling";
import {
  buildEpisodeEntitlementKeys,
  canAccessShow,
  listActiveEntitlementKeysForUser
} from "@/lib/watchEntitlements";
import { listWatchChapterMarkersByEpisode } from "@/lib/watchChapterMarkers";
import { resolveWatchRequestRegion } from "@/lib/watchRequestContext";
import { listWatchEpisodeRights, listWatchShowRights, mergeWatchVisibility } from "@/lib/watchRights";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const now = new Date();
  const episode = await prisma.episode.findUnique({
    where: { id },
    include: {
      season: {
        include: {
          show: true,
          episodes: { orderBy: { createdAt: "asc" } }
        }
      }
    }
  });

  if (!episode) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }
  const [showRightsById, episodeRightsById] = await Promise.all([
    listWatchShowRights([episode.season.show.id]),
    listWatchEpisodeRights([episode.id, ...episode.season.episodes.map((item) => item.id)])
  ]);
  const showRights = showRightsById.get(episode.season.show.id);
  const currentEpisodeRights = episodeRightsById.get(episode.id);
  if (!showRights || !currentEpisodeRights) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }

  const releaseState = evaluateReleaseSchedule(episode, now);
  const premiereStatus = getLivePremiereStatus(episode, now);

  if (!releaseState.isReleased && !canAccessPremiereEpisodePage(episode, now)) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
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

  const requestRegion = resolveWatchRequestRegion(request.headers);
  const activeEntitlementKeys = await listActiveEntitlementKeysForUser(session?.user?.id ?? null);
  const viewer = {
    userId: session?.user?.id ?? null,
    role: session?.user?.role ?? null,
    isKidsProfile,
    requestRegion,
    activeEntitlementKeys
  };

  const access = canAccessShow(
    {
      isPremium: episode.season.show.isPremium,
      maturityRating: episode.season.show.maturityRating,
      visibility: mergeWatchVisibility(showRights.visibility, currentEpisodeRights.visibility),
      allowedRegions: currentEpisodeRights.allowedRegions.length > 0 ? currentEpisodeRights.allowedRegions : showRights.allowedRegions,
      requiresEntitlement: currentEpisodeRights.requiresEntitlement || showRights.requiresEntitlement,
      entitlementKeys: buildEpisodeEntitlementKeys(episode, episode.season.show)
    },
    viewer,
    { allowUnlisted: true }
  );

  if (access.reason === "private" || access.reason === "region_restricted") {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }

  const episodeNumber = episode.season.episodes.findIndex((item) => item.id === episode.id) + 1;
  const nextEpisodes = episode.season.episodes.filter((item) => {
    const nextAccess = canAccessShow(
      {
        isPremium: episode.season.show.isPremium,
        maturityRating: episode.season.show.maturityRating,
        visibility: mergeWatchVisibility(showRights.visibility, episodeRightsById.get(item.id)?.visibility ?? "PUBLIC"),
        allowedRegions:
          (episodeRightsById.get(item.id)?.allowedRegions?.length ?? 0) > 0
            ? episodeRightsById.get(item.id)?.allowedRegions
            : showRights.allowedRegions,
        requiresEntitlement: Boolean(episodeRightsById.get(item.id)?.requiresEntitlement) || showRights.requiresEntitlement,
        entitlementKeys: buildEpisodeEntitlementKeys(item, episode.season.show)
      },
      viewer
    );

    return (
      nextAccess.reason !== "private" &&
      nextAccess.reason !== "unlisted" &&
      nextAccess.reason !== "region_restricted" &&
      evaluateReleaseSchedule(item, now).isReleased
    );
  });
  const chapterMarkersByEpisode = await listWatchChapterMarkersByEpisode(episode.season.show.slug, [
    {
      id: episode.id,
      title: episode.title,
      seasonNumber: episode.season.number,
      episodeNumber: episodeNumber > 0 ? episodeNumber : null
    }
  ]);

  return NextResponse.json({
    episode: {
      id: episode.id,
      title: episode.title,
      description: episode.description,
      lengthSeconds: episode.lengthSeconds,
      assetUrl: access.allowed && premiereStatus.state === "VOD" ? episode.assetUrl : null,
      chapterMarkers: premiereStatus.state === "VOD" ? chapterMarkersByEpisode[episode.id] ?? [] : [],
      premiere: {
        state: premiereStatus.state,
        isPremiereEnabled: premiereStatus.isPremiereEnabled,
        startsAt: premiereStatus.startsAt?.toISOString() ?? null,
        effectiveEndsAt: premiereStatus.effectiveEndsAt?.toISOString() ?? null,
        chatEnabled: premiereStatus.chatEnabled
      }
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
