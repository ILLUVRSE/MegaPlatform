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
import {
  buildEpisodeEntitlementKeys,
  buildShowEntitlementKeys,
  canAccessShow,
  listActiveEntitlementKeysForUser
} from "@/lib/watchEntitlements";
import { listWatchChapterMarkersByEpisode } from "@/lib/watchChapterMarkers";
import { readWatchMonetization, resolveWatchMonetization } from "@/lib/watchMonetization";
import { resolveWatchRequestRegion } from "@/lib/watchRequestContext";
import { listWatchEpisodeRights, listWatchShowRights, mergeWatchVisibility } from "@/lib/watchRights";

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
  const showRightsById = await listWatchShowRights([show.id]);
  const showRights = showRightsById.get(show.id);
  if (!showRights) {
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

  const requestRegion = resolveWatchRequestRegion(request.headers);
  const activeEntitlementKeys = await listActiveEntitlementKeysForUser(session?.user?.id ?? null);
  const showMonetization = resolveWatchMonetization(readWatchMonetization(show));
  const viewer = {
    userId: session?.user?.id ?? null,
    role: session?.user?.role ?? null,
    isKidsProfile,
    requestRegion,
    activeEntitlementKeys
  };

  const access = canAccessShow(
    {
      monetizationMode: showMonetization.monetizationMode,
      maturityRating: show.maturityRating,
      visibility: showRights.visibility,
      allowedRegions: showRights.allowedRegions,
      requiresEntitlement: showRights.requiresEntitlement,
      entitlementKeys: buildShowEntitlementKeys(show)
    },
    viewer,
    { allowUnlisted: true }
  );

  if (access.reason === "private") {
    return NextResponse.json({ error: "Show not found" }, { status: 404 });
  }

  const episodeRightsById = await listWatchEpisodeRights(show.seasons.flatMap((season) => season.episodes.map((episode) => episode.id)));
  const episodeAccessById = new Map<string, ReturnType<typeof canAccessShow>>();
  for (const season of show.seasons) {
    for (const episode of season.episodes) {
      const episodeRights = episodeRightsById.get(episode.id);
      if (!episodeRights) {
        continue;
      }
      episodeAccessById.set(
        episode.id,
        canAccessShow(
          {
            monetizationMode: resolveWatchMonetization(readWatchMonetization(show), readWatchMonetization(episode)).monetizationMode,
            maturityRating: show.maturityRating,
            visibility: mergeWatchVisibility(showRights.visibility, episodeRights.visibility),
            allowedRegions: episodeRights.allowedRegions.length > 0 ? episodeRights.allowedRegions : showRights.allowedRegions,
            requiresEntitlement: episodeRights.requiresEntitlement || showRights.requiresEntitlement,
            entitlementKeys: buildEpisodeEntitlementKeys(episode, show)
          },
          viewer
        )
      );
    }
  }

  const chapterMarkersByEpisode = await listWatchChapterMarkersByEpisode(
    show.slug,
    show.seasons.flatMap((season) =>
      season.episodes
        .filter((episode) => {
          const episodeAccess = episodeAccessById.get(episode.id);
          const releaseState = evaluateReleaseSchedule(episode, now);
          const premiereState = getLivePremiereStatus(episode, now);
          return (
            episodeAccess?.reason !== "private" &&
            episodeAccess?.reason !== "unlisted" &&
            episodeAccess?.reason !== "region_restricted" &&
            (releaseState.isReleased || premiereState.isPremiereEnabled)
          );
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
        const episodeAccess = episodeAccessById.get(episode.id);
        const releaseState = evaluateReleaseSchedule(episode, now);
        const premiereState = getLivePremiereStatus(episode, now);
        return (
          episodeAccess?.reason !== "private" &&
          episodeAccess?.reason !== "unlisted" &&
          episodeAccess?.reason !== "region_restricted" &&
          (releaseState.isReleased || premiereState.isPremiereEnabled)
        );
      })
      .map((episode) => {
        const watchEpisode = episode as typeof episode & {
          partyEnabled: boolean;
          defaultPartyMode: "STANDARD" | "COMMENTARY";
        };
        const premiereState = getLivePremiereStatus(episode, now);
        const monetization = resolveWatchMonetization(readWatchMonetization(show), readWatchMonetization(episode));
        const episodeAccess = episodeAccessById.get(episode.id) ?? { allowed: true, reason: "ok" as const };

        return {
          id: watchEpisode.id,
          title: watchEpisode.title,
          description: watchEpisode.description,
          lengthSeconds: watchEpisode.lengthSeconds,
          assetUrl: episodeAccess.allowed && premiereState.state === "VOD" ? watchEpisode.assetUrl : null,
          monetizationMode: monetization.monetizationMode,
          priceCents: monetization.priceCents,
          currency: monetization.currency,
          adsEnabled: monetization.adsEnabled,
          partyEnabled: watchEpisode.partyEnabled,
          defaultPartyMode: watchEpisode.defaultPartyMode,
          access: episodeAccess,
          chapterMarkers: premiereState.state === "VOD" ? chapterMarkersByEpisode[watchEpisode.id] ?? [] : [],
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
      monetizationMode: showMonetization.monetizationMode,
      priceCents: showMonetization.priceCents,
      currency: showMonetization.currency,
      adsEnabled: showMonetization.adsEnabled,
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
