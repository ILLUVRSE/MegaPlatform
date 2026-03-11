import { prisma } from '@/lib/prisma';
import { computeTrendScore } from '@/lib/trending';
import { startOfDay } from '@/lib/utils';

export async function computeDailyTrends(): Promise<{ count: number }> {
  const today = startOfDay(new Date());
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000);

  const titles = await prisma.title.findMany({
    include: {
      interactions: {
        where: { createdAt: { gte: sevenDaysAgo } }
      }
    }
  });

  if (!titles.length) return { count: 0 };

  const popularityValues = titles.map((t) => t.tmdbPopularity);
  const ratingValues = titles.map((t) => t.tmdbVoteAverage * Math.log(t.tmdbVoteCount + 1));
  const engagementCounts = titles.map((t) => t.interactions.length);

  const popMin = Math.min(...popularityValues);
  const popMax = Math.max(...popularityValues);
  const ratingMin = Math.min(...ratingValues);
  const ratingMax = Math.max(...ratingValues);
  const maxEngagement = Math.max(...engagementCounts, 1);

  const sortedByPopularity = [...titles].sort((a, b) => b.tmdbPopularity - a.tmdbPopularity);

  for (const title of titles) {
    const rank = sortedByPopularity.findIndex((t) => t.id === title.id) + 1;
    const computed = computeTrendScore({
      trendingRank: rank,
      trendingListSize: titles.length,
      popularity: title.tmdbPopularity,
      popMin,
      popMax,
      voteAverage: title.tmdbVoteAverage,
      voteCount: title.tmdbVoteCount,
      ratingMin,
      ratingMax,
      releaseDate: title.releaseDate,
      engagementEvents: title.interactions.length,
      maxEngagement
    });

    const prior = await prisma.trendSnapshot.findMany({
      where: {
        titleId: title.id,
        date: {
          gte: sevenDaysAgo,
          lt: today
        }
      },
      select: { trendScore: true }
    });

    const sevenAvg = prior.length ? prior.reduce((sum, s) => sum + s.trendScore, 0) / prior.length : computed.score;
    const momentum = computed.score - sevenAvg;

    await prisma.trendSnapshot.upsert({
      where: {
        titleId_date: {
          titleId: title.id,
          date: today
        }
      },
      update: {
        trendScore: computed.score,
        momentum,
        components: computed.components
      },
      create: {
        titleId: title.id,
        date: today,
        trendScore: computed.score,
        momentum,
        components: computed.components
      }
    });
  }

  return { count: titles.length };
}
