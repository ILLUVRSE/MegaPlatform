/**
 * Watch episode playback page.
 */
import { notFound } from "next/navigation";
import { prisma } from "@illuvrse/db";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PROFILE_COOKIE } from "@/lib/watchProfiles";
import { canAccessShow } from "@/lib/watchEntitlements";
import { listWatchChapterMarkersByEpisode } from "@/lib/watchChapterMarkers";
import EpisodePlayer from "../components/EpisodePlayer";

export default async function WatchEpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  const profileId = cookieStore.get(PROFILE_COOKIE)?.value ?? null;
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

  const episodeNumber = episode.season.episodes.findIndex((item) => item.id === episode.id) + 1;
  const nextEpisodes = episode.season.episodes.filter((item) => item.id !== episode.id).slice(0, 6);
  const chapterMarkersByEpisode = await listWatchChapterMarkersByEpisode(episode.season.show.slug, [
    {
      id: episode.id,
      title: episode.title,
      seasonNumber: episode.season.number,
      episodeNumber: episodeNumber > 0 ? episodeNumber : null
    }
  ]);

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
      />
    </div>
  );
}
