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
import { readWatchMonetization, resolveWatchMonetization } from "@/lib/watchMonetization";
import type { PartyLaunchMode } from "@/lib/watchParty";
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
  const watchEpisode = episode as typeof episode & {
    partyEnabled: boolean;
    defaultPartyMode: PartyLaunchMode;
  };
  const [showRightsById, episodeRightsById] = await Promise.all([
    listWatchShowRights([watchEpisode.season.show.id]),
    listWatchEpisodeRights([watchEpisode.id, ...watchEpisode.season.episodes.map((item) => item.id)])
  ]);
  const showRights = showRightsById.get(watchEpisode.season.show.id);
  const currentEpisodeRights = episodeRightsById.get(watchEpisode.id);
  if (!showRights || !currentEpisodeRights) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }

  const releaseState = evaluateReleaseSchedule(watchEpisode, now);
  const premiereStatus = getLivePremiereStatus(watchEpisode, now);

  if (!releaseState.isReleased && !canAccessPremiereEpisodePage(watchEpisode, now)) {
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
  const episodeMonetization = resolveWatchMonetization(
    readWatchMonetization(watchEpisode.season.show),
    readWatchMonetization(watchEpisode)
  );
  const viewer = {
    userId: session?.user?.id ?? null,
    role: session?.user?.role ?? null,
    isKidsProfile,
    requestRegion,
    activeEntitlementKeys
  };

  const access = canAccessShow(
    {
      monetizationMode: episodeMonetization.monetizationMode,
      maturityRating: watchEpisode.season.show.maturityRating,
      visibility: mergeWatchVisibility(showRights.visibility, currentEpisodeRights.visibility),
      allowedRegions: currentEpisodeRights.allowedRegions.length > 0 ? currentEpisodeRights.allowedRegions : showRights.allowedRegions,
      requiresEntitlement: currentEpisodeRights.requiresEntitlement || showRights.requiresEntitlement,
      entitlementKeys: buildEpisodeEntitlementKeys(watchEpisode, watchEpisode.season.show)
    },
    viewer,
    { allowUnlisted: true }
  );

  if (access.reason === "private" || access.reason === "region_restricted") {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }

  const episodeNumber = watchEpisode.season.episodes.findIndex((item) => item.id === watchEpisode.id) + 1;
  const nextEpisodes = watchEpisode.season.episodes.filter((item) => {
    const nextAccess = canAccessShow(
      {
        monetizationMode: resolveWatchMonetization(
            readWatchMonetization(watchEpisode.season.show),
            readWatchMonetization(item)
          ).monetizationMode,
        maturityRating: watchEpisode.season.show.maturityRating,
        visibility: mergeWatchVisibility(showRights.visibility, episodeRightsById.get(item.id)?.visibility ?? "PUBLIC"),
        allowedRegions:
          (episodeRightsById.get(item.id)?.allowedRegions?.length ?? 0) > 0
            ? episodeRightsById.get(item.id)?.allowedRegions
            : showRights.allowedRegions,
        requiresEntitlement: Boolean(episodeRightsById.get(item.id)?.requiresEntitlement) || showRights.requiresEntitlement,
        entitlementKeys: buildEpisodeEntitlementKeys(item, watchEpisode.season.show)
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
  const chapterMarkersByEpisode = await listWatchChapterMarkersByEpisode(watchEpisode.season.show.slug, [
    {
      id: watchEpisode.id,
      title: watchEpisode.title,
      seasonNumber: watchEpisode.season.number,
      episodeNumber: episodeNumber > 0 ? episodeNumber : null
    }
  ]);

  return NextResponse.json({
    episode: {
      id: watchEpisode.id,
      title: watchEpisode.title,
      description: watchEpisode.description,
      lengthSeconds: watchEpisode.lengthSeconds,
      assetUrl: access.allowed && premiereStatus.state === "VOD" ? watchEpisode.assetUrl : null,
      monetizationMode: episodeMonetization.monetizationMode,
      priceCents: episodeMonetization.priceCents,
      currency: episodeMonetization.currency,
      adsEnabled: episodeMonetization.adsEnabled,
      partyEnabled: watchEpisode.partyEnabled,
      defaultPartyMode: watchEpisode.defaultPartyMode,
      chapterMarkers: premiereStatus.state === "VOD" ? chapterMarkersByEpisode[watchEpisode.id] ?? [] : [],
      premiere: {
        state: premiereStatus.state,
        isPremiereEnabled: premiereStatus.isPremiereEnabled,
        startsAt: premiereStatus.startsAt?.toISOString() ?? null,
        effectiveEndsAt: premiereStatus.effectiveEndsAt?.toISOString() ?? null,
        chatEnabled: premiereStatus.chatEnabled
      }
    },
    season: {
      id: watchEpisode.season.id,
      number: watchEpisode.season.number,
      title: watchEpisode.season.title
    },
    show: {
      id: watchEpisode.season.show.id,
      title: watchEpisode.season.show.title,
      slug: watchEpisode.season.show.slug,
      description: watchEpisode.season.show.description,
      posterUrl: watchEpisode.season.show.posterUrl,
      heroUrl: watchEpisode.season.show.heroUrl,
      monetizationMode: resolveWatchMonetization(readWatchMonetization(watchEpisode.season.show)).monetizationMode,
      priceCents: resolveWatchMonetization(readWatchMonetization(watchEpisode.season.show)).priceCents,
      currency: resolveWatchMonetization(readWatchMonetization(watchEpisode.season.show)).currency,
      adsEnabled: resolveWatchMonetization(readWatchMonetization(watchEpisode.season.show)).adsEnabled,
      maturityRating: watchEpisode.season.show.maturityRating
    },
    access,
    nextEpisodes: nextEpisodes.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      lengthSeconds: item.lengthSeconds,
      monetizationMode: resolveWatchMonetization(
        readWatchMonetization(watchEpisode.season.show),
        readWatchMonetization(item)
      ).monetizationMode,
      priceCents: resolveWatchMonetization(
        readWatchMonetization(watchEpisode.season.show),
        readWatchMonetization(item)
      ).priceCents,
      currency: resolveWatchMonetization(
        readWatchMonetization(watchEpisode.season.show),
        readWatchMonetization(item)
      ).currency
    }))
  });
}
