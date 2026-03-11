import type { GoalieMode, MatchStats } from './types';

export interface RewardContext {
  mode: GoalieMode;
  score: number;
  stats: MatchStats;
  matchCompleted: boolean;
  challengeCompleted?: boolean;
  rankedCompleted?: boolean;
  careerObjectivePassed?: boolean;
}

export interface RewardBreakdown {
  coins: number;
  xp: number;
  coinsBy: {
    saves: number;
    perfect: number;
    streak: number;
    completion: number;
    bonus: number;
  };
  xpBy: {
    performance: number;
    score: number;
    completion: number;
    bonus: number;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function calculateRewards(context: RewardContext): RewardBreakdown {
  const savesCoins = context.stats.saves * 2;
  const perfectCoins = context.stats.perfectSaves * 3;
  const streakCoins = Math.min(80, context.stats.bestStreak * 5);
  const completionCoins = context.matchCompleted ? 40 : 0;

  let bonusCoins = 0;
  if (context.challengeCompleted) bonusCoins += 30;
  if (context.rankedCompleted) bonusCoins += 50;
  if (context.mode === 'career' && context.careerObjectivePassed) bonusCoins += 45;

  const rawCoins = savesCoins + perfectCoins + streakCoins + completionCoins + bonusCoins;

  const perfXp = context.stats.saves * 8 + context.stats.perfectSaves * 10;
  const scoreXp = Math.floor(context.score / 35);
  const completionXp = context.matchCompleted ? 110 : 20;
  const bonusXp = (context.challengeCompleted ? 70 : 0) + (context.rankedCompleted ? 80 : 0) + (context.careerObjectivePassed ? 90 : 0);
  const rawXp = perfXp + scoreXp + completionXp + bonusXp;

  return {
    coins: clamp(rawCoins, 0, 950),
    xp: clamp(rawXp, 0, 4200),
    coinsBy: {
      saves: savesCoins,
      perfect: perfectCoins,
      streak: streakCoins,
      completion: completionCoins,
      bonus: bonusCoins
    },
    xpBy: {
      performance: perfXp,
      score: scoreXp,
      completion: completionXp,
      bonus: bonusXp
    }
  };
}

export function levelFromXp(xp: number): number {
  const value = Math.max(0, xp);
  let level = 1;
  let threshold = 300;
  let remaining = value;
  while (remaining >= threshold) {
    remaining -= threshold;
    level += 1;
    threshold = Math.round(threshold * 1.12 + 40);
    if (level >= 100) break;
  }
  return level;
}

export function xpToNextLevel(xp: number): { level: number; currentLevelXp: number; nextLevelXp: number; progress: number } {
  const value = Math.max(0, xp);
  let level = 1;
  let threshold = 300;
  let remaining = value;
  while (remaining >= threshold) {
    remaining -= threshold;
    level += 1;
    threshold = Math.round(threshold * 1.12 + 40);
    if (level >= 100) break;
  }
  return {
    level,
    currentLevelXp: remaining,
    nextLevelXp: threshold,
    progress: threshold > 0 ? remaining / threshold : 1
  };
}
