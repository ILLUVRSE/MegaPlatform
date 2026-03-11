import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { tmdbImage } from '@/lib/images';
import { metadataProvider } from '@/lib/providers';
import { personalizationBoost } from '@/lib/preferences';

export type DiscoverCard = {
  id: string;
  tmdbId: number;
  type: 'movie' | 'tv';
  name: string;
  overview: string;
  poster: string;
  backdrop: string;
  rating: number;
  platforms: string[];
  trailerKey: string | null;
  hook: string;
};

export async function getDiscoverQueue(
  userId: string,
  options?: { region?: string; platform?: string; genre?: string; runtimeBucket?: 'short' | 'medium' | 'long' }
): Promise<DiscoverCard[]> {
  const region = options?.region || 'US';
  const [pref, interacted] = await Promise.all([
    prisma.userPreference.findUnique({ where: { userId } }),
    prisma.userInteraction.findMany({ where: { userId }, select: { titleId: true } })
  ]);

  const seen = new Set(interacted.map((i) => i.titleId));
  const filterWhere: Prisma.TitleWhereInput = {
    ...(options?.platform
      ? {
          availability: {
            some: {
              platform: {
                equals: options.platform,
                mode: 'insensitive'
              },
              region
            }
          }
        }
      : {}),
    ...(options?.genre
      ? {
          genres: {
            some: {
              genre: {
                name: {
                  equals: options.genre,
                  mode: 'insensitive'
                }
              }
            }
          }
        }
      : {}),
    ...(options?.runtimeBucket === 'short'
      ? { runtime: { lte: 45 } }
      : options?.runtimeBucket === 'medium'
        ? { runtime: { gt: 45, lte: 110 } }
        : options?.runtimeBucket === 'long'
          ? { runtime: { gt: 110 } }
          : {})
  };

  let candidates = await prisma.title.findMany({
    where: {
      id: { notIn: [...seen] },
      ...filterWhere
    },
    include: {
      genres: { include: { genre: true } },
      availability: { where: { region } },
      trendSnapshots: { orderBy: { date: 'desc' }, take: 1 }
    },
    take: 120
  });

  if (!candidates.length) {
    candidates = await prisma.title.findMany({
      where: filterWhere,
      include: {
        genres: { include: { genre: true } },
        availability: { where: { region } },
        trendSnapshots: { orderBy: { date: 'desc' }, take: 1 }
      },
      take: 120
    });
  }

  const sorted = candidates
    .map((title) => {
      const trend = title.trendSnapshots[0]?.trendScore || 0;
      const personal = personalizationBoost(title, pref);
      return { title, rank: trend + personal };
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 30);

  const result = await Promise.all(
    sorted.map(async (entry) => {
      const title = entry.title;
      const videos = await metadataProvider.getVideos(title.type, title.tmdbId);
      const trailer = videos.find((v) => v.site === 'YouTube' && v.type.toLowerCase().includes('trailer')) || videos[0] || null;

      return {
        id: title.id,
        tmdbId: title.tmdbId,
        type: title.type,
        name: title.name,
        overview: title.overview,
        poster: tmdbImage(title.posterPath, 'w500'),
        backdrop: tmdbImage(title.backdropPath, 'w780'),
        rating: title.tmdbVoteAverage,
        platforms: title.availability.map((a) => a.platform),
        trailerKey: trailer?.key || null,
        hook: title.overview ? `${title.overview.slice(0, 120)}...` : 'Fresh pick matched to your trend profile.'
      };
    })
  );

  return result;
}
