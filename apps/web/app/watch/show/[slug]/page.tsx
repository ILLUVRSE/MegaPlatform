/**
 * Watch show detail page.
 */
import { notFound } from "next/navigation";
import { prisma } from "@illuvrse/db";
import { cookies, headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listPublishedInteractiveExtrasForShowByProjectSlug } from "@/lib/interactiveExtras";
import { getLivePremiereStatus } from "@/lib/livePremiere";
import { evaluateReleaseSchedule, getEarliestUpcomingRelease } from "@/lib/releaseScheduling";
import { listPublishedShowExtrasForWatchByProjectSlug } from "@/lib/showExtras";
import {
  buildEpisodeEntitlementKeys,
  buildShowEntitlementKeys,
  canAccessShow,
  listActiveEntitlementKeysForUser,
  type WatchAccessDecision
} from "@/lib/watchEntitlements";
import { listWatchChapterMarkersByEpisode, type WatchChapterMarker } from "@/lib/watchChapterMarkers";
import { PROFILE_COOKIE } from "@/lib/watchProfiles";
import { readWatchMonetization, resolveWatchMonetization } from "@/lib/watchMonetization";
import { resolveWatchRequestRegion } from "@/lib/watchRequestContext";
import { listWatchEpisodeRights, listWatchShowRights, mergeWatchVisibility } from "@/lib/watchRights";
import InteractiveExtrasPanel from "../../components/InteractiveExtrasPanel";
import ShowDetailClient from "../components/ShowDetailClient";

type ShowEpisode = {
  id: string;
  title: string;
  description?: string | null;
  lengthSeconds: number;
  assetUrl: string;
  monetizationMode: "FREE" | "PREMIUM" | "TICKETED";
  priceCents: number | null;
  currency: string | null;
  adsEnabled: boolean;
  access: WatchAccessDecision;
  chapterMarkers: WatchChapterMarker[];
  premiereState: "VOD" | "UPCOMING" | "LIVE";
  premiereStartsAt: string | null;
};

type ShowExtra = {
  id: string;
  type: "BEHIND_THE_SCENES" | "COMMENTARY" | "BONUS_CLIP" | "TRAILER";
  title: string;
  description?: string | null;
  assetUrl: string | null;
  runtimeSeconds: number | null;
};

export default async function WatchShowPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const now = new Date();
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  const headerStore = await headers();
  const profileId = cookieStore.get(PROFILE_COOKIE)?.value ?? null;
  const requestRegion = resolveWatchRequestRegion(headerStore);

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
    notFound();
  }
  const showRightsById = await listWatchShowRights([show.id]);
  const showRights = showRightsById.get(show.id);
  if (!showRights) {
    notFound();
  }

  let isSaved = false;
  let resumeText: string | null = null;
  let isKidsProfile = false;

  if (session?.user?.id && profileId) {
    const profile = await prisma.profile.findFirst({
      where: { id: profileId, userId: session.user.id }
    });

    if (profile) {
      isKidsProfile = profile.isKids;
      const listItem = await prisma.myListItem.findFirst({
        where: { profileId: profile.id, mediaType: "SHOW", showId: show.id }
      });
      isSaved = Boolean(listItem);

      const progress = await prisma.watchProgress.findFirst({
        where: {
          profileId: profile.id,
          episode: { season: { showId: show.id } }
        },
        orderBy: { updatedAt: "desc" },
        include: { episode: { include: { season: true } } }
      });

      if (progress) {
        const season = show.seasons.find((item) => item.id === progress.episode.seasonId);
        const episodeNumber = (season?.episodes.findIndex((item) => item.id === progress.episode.id) ?? -1) + 1;
        const minutes = Math.floor(progress.positionSec / 60);
        const seconds = `${progress.positionSec % 60}`.padStart(2, "0");
        resumeText = `Resume S${progress.episode.season.number}E${Math.max(1, episodeNumber)} at ${minutes}:${seconds}`;
      }
    }
  }

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
    notFound();
  }

  const episodeRightsById = await listWatchEpisodeRights(show.seasons.flatMap((season) => season.episodes.map((episode) => episode.id)));
  const episodeAccessById = new Map<string, WatchAccessDecision>();
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

  const extras = await listPublishedShowExtrasForWatchByProjectSlug(show.slug, now);
  const interactiveExtras = await listPublishedInteractiveExtrasForShowByProjectSlug(show.slug);

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

  const episodesBySeason = show.seasons.reduce((acc, season) => {
    acc[season.id] = season.episodes
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
        const premiereState = getLivePremiereStatus(episode, now);
        const monetization = resolveWatchMonetization(readWatchMonetization(show), readWatchMonetization(episode));
        const episodeAccess = episodeAccessById.get(episode.id) ?? { allowed: true, reason: "ok" as const };

        return {
          id: episode.id,
          title: episode.title,
          description: episode.description,
          lengthSeconds: episode.lengthSeconds,
          assetUrl: episodeAccess.allowed ? episode.assetUrl : "",
          monetizationMode: monetization.monetizationMode,
          priceCents: monetization.priceCents,
          currency: monetization.currency,
          adsEnabled: monetization.adsEnabled,
          access: episodeAccess,
          chapterMarkers: premiereState.state === "VOD" ? chapterMarkersByEpisode[episode.id] ?? [] : [],
          premiereState: premiereState.state,
          premiereStartsAt: premiereState.startsAt?.toISOString() ?? null
        };
      });

    return acc;
  }, {} as Record<string, ShowEpisode[]>);

  const showRelease = evaluateReleaseSchedule(show, now);
  const comingSoonAt =
    getEarliestUpcomingRelease(
      show.seasons.flatMap((season) => season.episodes),
      now
    ) ?? (showRelease.isComingSoon ? showRelease.releaseAt : null);
  const comingSoonText =
    Object.values(episodesBySeason).every((episodes) => episodes.length === 0) && comingSoonAt
      ? `Coming Soon: premieres ${comingSoonAt.toLocaleString()}`
      : null;

  return (
    <div className="-mx-6 space-y-8 bg-[#07070b] px-6 pb-10 text-white">
      <header className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5">
        <img
          src={show.heroUrl ?? "https://placehold.co/1400x600?text=ILLUVRSE+Show"}
          alt={show.title}
          className="h-[320px] w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end gap-3 p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Show</p>
          <h1 className="text-3xl font-semibold md:text-4xl">{show.title}</h1>
          <p className="max-w-2xl text-sm text-white/70">{show.description}</p>
        </div>
      </header>

      <ShowDetailClient
        show={{
          id: show.id,
          title: show.title,
        slug: show.slug,
        description: show.description,
        posterUrl: show.posterUrl,
        heroUrl: show.heroUrl,
        monetizationMode: showMonetization.monetizationMode,
        priceCents: showMonetization.priceCents,
        currency: showMonetization.currency,
        adsEnabled: showMonetization.adsEnabled
      }}
        seasons={show.seasons.map((season) => ({
          id: season.id,
          number: season.number,
          title: season.title
        }))}
        episodesBySeason={episodesBySeason}
        isSaved={isSaved}
        resumeText={resumeText}
        canSave={Boolean(session?.user?.id && profileId)}
        access={access}
        comingSoonText={comingSoonText}
        extras={extras.map((extra) => ({
          id: extra.id,
          type: extra.type,
          title: extra.title,
          description: extra.description,
          assetUrl: access.allowed ? extra.assetUrl : null,
          runtimeSeconds: extra.runtimeSeconds
        } satisfies ShowExtra))}
      />
      <InteractiveExtrasPanel
        extras={interactiveExtras.map((extra) => ({
          id: extra.id,
          type: extra.type,
          title: extra.title,
          payload: extra.payload
        }))}
        title="Interactive Extras"
      />
    </div>
  );
}
