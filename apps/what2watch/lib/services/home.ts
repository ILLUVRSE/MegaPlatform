import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { tmdbImage } from '@/lib/images';
import { personalizationBoost } from '@/lib/preferences';
import { startOfDay } from '@/lib/utils';

export type FeedCard = {
  id: string;
  tmdbId: number;
  type: 'movie' | 'tv';
  name: string;
  overview: string;
  poster: string;
  backdrop: string;
  rating: number;
  trendScore: number;
  momentum: number;
  platforms: string[];
  releaseDate: string | null;
};

type HomeRow = {
  id: string;
  tmdbId: number;
  type: 'movie' | 'tv';
  name: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: Date | null;
  tmdbVoteAverage: number;
  availability: Array<{ platform: string }>;
  trendSnapshots: Array<{ trendScore: number; momentum: number }>;
};

function mapCard(row: HomeRow): FeedCard {
  const snapshot = row.trendSnapshots?.[0];
  return {
    id: row.id,
    tmdbId: row.tmdbId,
    type: row.type,
    name: row.name,
    overview: row.overview,
    poster: tmdbImage(row.posterPath, 'w500'),
    backdrop: tmdbImage(row.backdropPath, 'w780'),
    rating: row.tmdbVoteAverage,
    trendScore: snapshot?.trendScore || 0,
    momentum: snapshot?.momentum || 0,
    platforms: (row.availability || []).map((a: { platform: string }) => a.platform),
    releaseDate: row.releaseDate ? row.releaseDate.toISOString() : null
  };
}

export async function getHomeFeed(options: {
  userId?: string;
  region?: string;
  platform?: string;
  genre?: string;
  runtimeBucket?: 'short' | 'medium' | 'long';
}): Promise<{ explodingNow: FeedCard[]; gainingMomentum: FeedCard[]; newThisWeek: FeedCard[]; leavingSoon: FeedCard[] }> {
  const today = startOfDay();
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const pref = options.userId
    ? await prisma.userPreference.findUnique({
        where: { userId: options.userId }
      })
    : null;

  const where: Prisma.TitleWhereInput = {
    ...(options.genre
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
    ...(options.runtimeBucket === 'short'
      ? { runtime: { lte: 45 } }
      : options.runtimeBucket === 'medium'
        ? { runtime: { gt: 45, lte: 110 } }
        : options.runtimeBucket === 'long'
          ? { runtime: { gt: 110 } }
          : {}),
    ...(options.platform
      ? {
          availability: {
            some: {
              platform: {
                equals: options.platform,
                mode: 'insensitive'
              },
              region: options.region || 'US'
            }
          }
        }
      : {})
  };

  const baseTitles = await prisma.title.findMany({
    where,
    include: {
      availability: {
        where: { region: options.region || 'US' }
      },
      genres: {
        include: { genre: true }
      },
      trendSnapshots: {
        where: { date: { gte: today } },
        orderBy: { date: 'desc' },
        take: 1
      }
    },
    take: 250
  });

  const ranked = baseTitles
    .map((t) => {
      const snapshot = t.trendSnapshots[0];
      const pBoost = personalizationBoost(t, pref);
      return {
        ...t,
        _rank: (snapshot?.trendScore || 0) + pBoost
      };
    })
    .sort((a, b) => b._rank - a._rank);

  const explodingNow = ranked.slice(0, 10).map(mapCard);
  const gainingMomentum = ranked
    .filter((t) => (t.trendSnapshots[0]?.momentum || 0) > 0)
    .sort((a, b) => (b.trendSnapshots[0]?.momentum || 0) - (a.trendSnapshots[0]?.momentum || 0))
    .slice(0, 10)
    .map(mapCard);

  const newThisWeek = ranked
    .filter((t) => t.releaseDate && t.releaseDate >= weekAgo)
    .slice(0, 10)
    .map(mapCard);

  const leavingSoon = ranked
    .filter((t) => t.availability.some((a) => a.leavingDate && a.leavingDate <= new Date(Date.now() + 14 * 86400000)))
    .slice(0, 10)
    .map(mapCard);

  return {
    explodingNow,
    gainingMomentum,
    newThisWeek,
    leavingSoon
  };
}
