/**
 * Watch episode playback page.
 */
import { notFound } from "next/navigation";
import { prisma } from "@illuvrse/db";
import { cookies, headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessPremiereEpisodePage, getLivePremiereStatus } from "@/lib/livePremiere";
import { evaluateReleaseSchedule } from "@/lib/releaseScheduling";
import {
  buildEpisodeEntitlementKeys,
  canAccessShow,
  listActiveEntitlementKeysForUser
} from "@/lib/watchEntitlements";
import { listWatchChapterMarkersByEpisode } from "@/lib/watchChapterMarkers";
import { PROFILE_COOKIE } from "@/lib/watchProfiles";
import { resolveWatchRequestRegion } from "@/lib/watchRequestContext";
import { listWatchEpisodeRights, listWatchShowRights, mergeWatchVisibility } from "@/lib/watchRights";
import EpisodePlayer from "../components/EpisodePlayer";

export default async function WatchEpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  const headerStore = await headers();
  const profileId = cookieStore.get(PROFILE_COOKIE)?.value ?? null;
  const requestRegion = resolveWatchRequestRegion(headerStore);
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
    notFound();
  }
  const [showRightsById, episodeRightsById] = await Promise.all([
    listWatchShowRights([episode.season.show.id]),
    listWatchEpisodeRights([episode.id, ...episode.season.episodes.map((item) => item.id)])
  ]);
  const showRights = showRightsById.get(episode.season.show.id);
  const currentEpisodeRights = episodeRightsById.get(episode.id);
  if (!showRights || !currentEpisodeRights) {
    notFound();
  }

  let initialPositionSec: number | null = null;
  let enableDbProgress = false;
  let isKidsProfile = false;
  if (session?.user?.id && profileId) {
    const profile = await prisma.profile.findFirst({
      where: { id: profileId, userId: session.user.id }
    });
    if (profile) {
      isKidsProfile = profile.isKids;
      enableDbProgress = true;
      const progress = await prisma.watchProgress.findUnique({
        where: { profileId_episodeId: { profileId: profile.id, episodeId: episode.id } }
      });
      initialPositionSec = progress?.positionSec ?? null;
    }
  }

  const activeEntitlementKeys = await listActiveEntitlementKeysForUser(session?.user?.id ?? null);
  const access = canAccessShow(
    {
      isPremium: episode.season.show.isPremium,
      maturityRating: episode.season.show.maturityRating,
      visibility: mergeWatchVisibility(showRights.visibility, currentEpisodeRights.visibility),
      allowedRegions: currentEpisodeRights.allowedRegions.length > 0 ? currentEpisodeRights.allowedRegions : showRights.allowedRegions,
      requiresEntitlement: currentEpisodeRights.requiresEntitlement || showRights.requiresEntitlement,
      entitlementKeys: buildEpisodeEntitlementKeys(episode, episode.season.show)
    },
    {
      userId: session?.user?.id ?? null,
      role: session?.user?.role ?? null,
      isKidsProfile,
      requestRegion,
      activeEntitlementKeys
    },
    { allowUnlisted: true }
  );

  if (access.reason === "private" || access.reason === "region_restricted") {
    notFound();
  }

  const releaseState = evaluateReleaseSchedule(episode, now);
  const premiereStatus = getLivePremiereStatus(episode, now);

  if (!releaseState.isReleased && !canAccessPremiereEpisodePage(episode, now)) {
    notFound();
  }

  const episodeNumber = episode.season.episodes.findIndex((item) => item.id === episode.id) + 1;
  const nextEpisodes = episode.season.episodes
    .filter((item) => {
      const nextAccess = canAccessShow(
        {
          isPremium: episode.season.show.isPremium,
          maturityRating: episode.season.show.maturityRating,
          visibility: mergeWatchVisibility(
            showRights.visibility,
            episodeRightsById.get(item.id)?.visibility ?? "PUBLIC"
          ),
          allowedRegions:
            (episodeRightsById.get(item.id)?.allowedRegions?.length ?? 0) > 0
              ? episodeRightsById.get(item.id)?.allowedRegions
              : showRights.allowedRegions,
          requiresEntitlement:
            Boolean(episodeRightsById.get(item.id)?.requiresEntitlement) || showRights.requiresEntitlement,
          entitlementKeys: buildEpisodeEntitlementKeys(item, episode.season.show)
        },
        {
          userId: session?.user?.id ?? null,
          role: session?.user?.role ?? null,
          isKidsProfile,
          requestRegion,
          activeEntitlementKeys
        }
      );

      return (
        nextAccess.reason !== "private" &&
        nextAccess.reason !== "unlisted" &&
        nextAccess.reason !== "region_restricted" &&
        item.id !== episode.id &&
        evaluateReleaseSchedule(item, now).isReleased
      );
    })
    .slice(0, 6);

  const chapterMarkersByEpisode = await listWatchChapterMarkersByEpisode(episode.season.show.slug, [
    {
      id: episode.id,
      title: episode.title,
      seasonNumber: episode.season.number,
      episodeNumber: episodeNumber > 0 ? episodeNumber : null
    }
  ]);

  return (
    <div className="-mx-6 space-y-8 bg-[#07070b] px-6 pb-10 text-white">
      <EpisodePlayer
        episode={{
          id: episode.id,
          title: episode.title,
          description: episode.description,
          lengthSeconds: episode.lengthSeconds,
          assetUrl: access.allowed ? episode.assetUrl : ""
        }}
        show={{
          title: episode.season.show.title,
          slug: episode.season.show.slug,
          posterUrl: episode.season.show.posterUrl
        }}
        season={{
          number: episode.season.number,
          title: episode.season.title
        }}
        chapterMarkers={chapterMarkersByEpisode[episode.id] ?? []}
        nextEpisodes={nextEpisodes.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description
        }))}
        initialPositionSec={initialPositionSec}
        enableDbProgress={enableDbProgress}
        access={access}
        premiere={{
          state: premiereStatus.state,
          isPremiereEnabled: premiereStatus.isPremiereEnabled,
          startsAt: premiereStatus.startsAt?.toISOString() ?? null,
          effectiveEndsAt: premiereStatus.effectiveEndsAt?.toISOString() ?? null,
          chatEnabled: premiereStatus.chatEnabled
        }}
      />
    </div>
  );
}
