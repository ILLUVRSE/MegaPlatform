import { GAME_REGISTRY } from '../registry/games';
import type { PortalStats, RankRecord, RankTier } from '../types';
import { getSeasonForDate } from './seasons';

const TIER_THRESHOLDS: Array<{ tier: RankTier; minRating: number }> = [
  { tier: 'grandmaster', minRating: 1500 },
  { tier: 'diamond', minRating: 1400 },
  { tier: 'platinum', minRating: 1300 },
  { tier: 'gold', minRating: 1200 },
  { tier: 'silver', minRating: 1100 },
  { tier: 'bronze', minRating: 0 }
];

const DEFAULT_RATING = 1000;

function ratingToTier(rating: number): RankTier {
  for (const entry of TIER_THRESHOLDS) {
    if (rating >= entry.minRating) return entry.tier;
  }
  return 'bronze';
}

function createEmptyRecord(): RankRecord {
  return {
    rating: DEFAULT_RATING,
    tier: 'bronze',
    matches: 0,
    wins: 0,
    losses: 0,
    peakTier: 'bronze'
  };
}

function softResetRecord(record: RankRecord): RankRecord {
  const nextRating = Math.max(900, Math.round(record.rating - 100));
  const tier = ratingToTier(nextRating);
  return {
    ...record,
    rating: nextRating,
    tier,
    matches: 0,
    wins: 0,
    losses: 0
  };
}

function updatePeakTier(record: RankRecord): RankRecord {
  const tiers: RankTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'grandmaster'];
  const peakIndex = tiers.indexOf(record.peakTier);
  const currentIndex = tiers.indexOf(record.tier);
  if (currentIndex > peakIndex) {
    return { ...record, peakTier: record.tier };
  }
  return record;
}

function eloDelta(playerRating: number, opponentRating: number, result: 0 | 1): number {
  const expected = 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
  const k = playerRating < 1200 ? 28 : playerRating < 1400 ? 24 : 20;
  return Math.round(k * (result - expected));
}

export function ensureRankSeason(stats: PortalStats, now = Date.now()): PortalStats {
  const season = getSeasonForDate(now);
  if (stats.rank.seasonId === season.seasonId) return stats;

  const perGame: Record<string, RankRecord> = {};
  for (const game of GAME_REGISTRY) {
    const current = stats.rank.perGame[game.id] ?? createEmptyRecord();
    perGame[game.id] = softResetRecord(current);
  }

  return {
    ...stats,
    rank: {
      seasonId: season.seasonId,
      perGame,
      meta: softResetRecord(stats.rank.meta ?? createEmptyRecord())
    }
  };
}

export function applyRankedMatch(
  stats: PortalStats,
  gameId: string,
  didWin: boolean
): { next: PortalStats; delta: number } {
  const base = ensureRankSeason(stats);
  const currentRecord = base.rank.perGame[gameId] ?? createEmptyRecord();
  const delta = eloDelta(currentRecord.rating, DEFAULT_RATING, didWin ? 1 : 0);
  const nextRating = Math.max(800, currentRecord.rating + delta);
  const nextRecord = updatePeakTier({
    ...currentRecord,
    rating: nextRating,
    tier: ratingToTier(nextRating),
    matches: currentRecord.matches + 1,
    wins: currentRecord.wins + (didWin ? 1 : 0),
    losses: currentRecord.losses + (didWin ? 0 : 1)
  });

  const perGame = {
    ...base.rank.perGame,
    [gameId]: nextRecord
  };

  const ratings = Object.values(perGame)
    .map((record) => record.rating)
    .sort((a, b) => b - a)
    .slice(0, 3);
  const metaRating = ratings.length > 0 ? Math.round(ratings.reduce((sum, r) => sum + r, 0) / ratings.length) : DEFAULT_RATING;
  const metaRecord = updatePeakTier({
    ...base.rank.meta,
    rating: metaRating,
    tier: ratingToTier(metaRating)
  });

  return {
    next: {
      ...base,
      rank: {
        seasonId: base.rank.seasonId,
        perGame,
        meta: metaRecord
      }
    },
    delta
  };
}

export function formatTierLabel(tier: RankTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}
