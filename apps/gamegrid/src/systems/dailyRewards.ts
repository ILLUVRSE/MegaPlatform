import type { DailyRewardState, PortalStats } from '../types';
import { isoDay } from './seasons';
import { applyTicketDelta } from './economy';

const REWARD_LADDER = [200, 240, 280, 320, 360, 420, 500];

export function getDailyRewardAmount(dayIndex: number): number {
  const idx = Math.max(0, Math.min(REWARD_LADDER.length - 1, dayIndex));
  return REWARD_LADDER[idx];
}

export function ensureDailyReward(stats: PortalStats, now = Date.now()): PortalStats {
  const today = isoDay(now);
  if (!stats.dailyReward.dateKey) {
    return {
      ...stats,
      dailyReward: {
        dateKey: today,
        streakDay: 0,
        lastClaimedOn: null
      }
    };
  }

  return stats;
}

export function canClaimDailyReward(state: DailyRewardState, now = Date.now()): boolean {
  const today = isoDay(now);
  return state.lastClaimedOn !== today;
}

export function claimDailyReward(stats: PortalStats, now = Date.now()): { next: PortalStats; reward: number } {
  const seeded = ensureDailyReward(stats, now);
  const today = isoDay(now);
  const lastClaimed = seeded.dailyReward.lastClaimedOn;
  if (lastClaimed === today) {
    return { next: seeded, reward: 0 };
  }

  const dayDiff = (fromIso: string, toIso: string) => {
    const from = new Date(`${fromIso}T00:00:00.000Z`).getTime();
    const to = new Date(`${toIso}T00:00:00.000Z`).getTime();
    return Math.round((to - from) / 86_400_000);
  };
  let streakDay = seeded.dailyReward.streakDay;
  if (lastClaimed) {
    const gap = dayDiff(lastClaimed, today);
    if (gap === 1) {
      streakDay = Math.min(REWARD_LADDER.length, streakDay + 1);
    } else {
      streakDay = 1;
    }
  } else {
    streakDay = 1;
  }

  const reward = getDailyRewardAmount(streakDay - 1);
  const updated = applyTicketDelta(seeded, reward);
  return {
    next: {
      ...updated,
      dailyReward: {
        dateKey: today,
        streakDay,
        lastClaimedOn: today
      }
    },
    reward
  };
}
