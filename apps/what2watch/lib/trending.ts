import { Prisma } from '@prisma/client';
import { trendWeights } from '@/lib/config';
import { dateDiffDays, normalize } from '@/lib/utils';

export type TrendComponentInputs = {
  trendingRank: number;
  trendingListSize: number;
  popularity: number;
  popMin: number;
  popMax: number;
  voteAverage: number;
  voteCount: number;
  ratingMin: number;
  ratingMax: number;
  releaseDate?: Date | null;
  engagementEvents: number;
  maxEngagement: number;
};

export function recencyBoost(releaseDate?: Date | null): number {
  if (!releaseDate) return 0;
  const days = Math.max(0, dateDiffDays(releaseDate, new Date()));
  if (days <= 7) return 1;
  if (days <= 30) return 0.7;
  if (days <= 90) return 0.4;
  return 0.1;
}

export function computeTrendScore(input: TrendComponentInputs): { score: number; components: Prisma.JsonObject } {
  const trendingSignal = normalize(input.trendingListSize - input.trendingRank, 0, input.trendingListSize);
  const popularitySignal = normalize(input.popularity, input.popMin, input.popMax);
  const ratingBase = input.voteAverage * Math.log(input.voteCount + 1);
  const ratingSignal = normalize(ratingBase, input.ratingMin, input.ratingMax);
  const recencySignal = recencyBoost(input.releaseDate);
  const engagementSignal = normalize(input.engagementEvents, 0, input.maxEngagement || 1);

  const score =
    trendWeights.trending * trendingSignal +
    trendWeights.popularity * popularitySignal +
    trendWeights.rating * ratingSignal +
    trendWeights.recency * recencySignal +
    trendWeights.engagement * engagementSignal;

  return {
    score,
    components: {
      trendingSignal,
      popularitySignal,
      ratingSignal,
      recencySignal,
      engagementSignal
    }
  };
}

export function whyTrending(components: Prisma.JsonValue): string {
  const c = (components || {}) as Record<string, number>;
  const reasons: string[] = [];

  if ((c.trendingSignal || 0) > 0.7) reasons.push('strong TMDB trending rank');
  if ((c.popularitySignal || 0) > 0.65) reasons.push('high audience interest');
  if ((c.ratingSignal || 0) > 0.6) reasons.push('solid rating velocity');
  if ((c.recencySignal || 0) > 0.7) reasons.push('fresh release timing');
  if ((c.engagementSignal || 0) > 0.3) reasons.push('active in-app saves and swipes');

  if (reasons.length === 0) return 'Steady performance across popularity, ratings, and recency signals.';
  return `Trending because of ${reasons.slice(0, 3).join(', ')}.`;
}
