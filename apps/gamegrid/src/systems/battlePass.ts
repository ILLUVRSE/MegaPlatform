import type { BattlePassState, PortalStats } from '../types';
import { getSeasonForDate } from './seasons';

const BATTLE_PASS_TIERS = 60;
const XP_PER_TIER = 400;

export interface BattlePassReward {
  tier: number;
  label: string;
}

const REWARDS: BattlePassReward[] = Array.from({ length: BATTLE_PASS_TIERS }, (_, index) => ({
  tier: index + 1,
  label: index % 5 === 0 ? 'Premium Cosmetic' : index % 3 === 0 ? 'Emote' : 'Ticket Boost'
}));

export function ensureBattlePassSeason(stats: PortalStats, now = Date.now()): PortalStats {
  const season = getSeasonForDate(now);
  if (stats.battlePass.seasonId === season.seasonId) return stats;
  const next: BattlePassState = {
    seasonId: season.seasonId,
    tier: 0,
    xp: 0,
    premiumUnlocked: stats.battlePass.premiumUnlocked
  };
  return { ...stats, battlePass: next };
}

export function applyBattlePassXp(stats: PortalStats, xpEarned: number, now = Date.now()): { next: PortalStats; tiersGained: number } {
  const seeded = ensureBattlePassSeason(stats, now);
  const current = seeded.battlePass;
  let xp = current.xp + Math.max(0, Math.round(xpEarned));
  let tier = current.tier;
  while (xp >= XP_PER_TIER && tier < BATTLE_PASS_TIERS) {
    xp -= XP_PER_TIER;
    tier += 1;
  }
  const tiersGained = tier - current.tier;
  return {
    next: {
      ...seeded,
      battlePass: {
        ...current,
        xp,
        tier
      }
    },
    tiersGained
  };
}

export function battlePassProgress(state: BattlePassState): { currentTier: number; nextTier: number; pct: number } {
  const pct = Math.round((state.xp / XP_PER_TIER) * 100);
  return {
    currentTier: state.tier,
    nextTier: Math.min(BATTLE_PASS_TIERS, state.tier + 1),
    pct: Math.max(0, Math.min(100, pct))
  };
}

export function getBattlePassRewards(): BattlePassReward[] {
  return REWARDS;
}
