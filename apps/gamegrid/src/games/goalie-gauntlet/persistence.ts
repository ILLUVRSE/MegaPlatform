import type { ChallengeProgress, GoalieMode, GoaliePersistentStats, GoalieStoredSettings } from './types';
import { resolveRankTier } from './ranked';

const SETTINGS_KEY = 'gamegrid.goalie-gauntlet.settings.v2';
const STATS_KEY = 'gamegrid.goalie-gauntlet.stats.v2';

const DEFAULT_SETTINGS: GoalieStoredSettings = {
  mode: 'survival',
  difficulty: 'medium',
  controls: 'drag',
  sensitivity: 'medium',
  assistLaneIndicator: true,
  warmup: true,
  haptics: true,
  reducedMotion: false,
  lowQuality: false,
  preLaneIndicator: true
};

const DEFAULT_STATS: GoaliePersistentStats = {
  bestStreak: 0,
  totalSaves: 0,
  perfectSaves: 0,
  bestScoreByMode: {
    survival: 0,
    time_attack: 0,
    challenge: 0,
    ranked: 0,
    career: 0
  },
  lastRankedScore: 0,
  bestRankedScore: 0,
  rankedTier: 'Bronze',
  challengeCompletion: {},
  unlockedMaskColors: ['#f2f7ff'],
  selectedMaskColor: '#f2f7ff'
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as Record<string, unknown>) } as T;
  } catch {
    return fallback;
  }
}

export function loadGoalieSettings(): GoalieStoredSettings {
  return readJson<GoalieStoredSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
}

export function saveGoalieSettings(settings: GoalieStoredSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // no-op
  }
}

export function loadGoalieStats(): GoaliePersistentStats {
  const stats = readJson<GoaliePersistentStats>(STATS_KEY, DEFAULT_STATS);
  return {
    ...DEFAULT_STATS,
    ...stats,
    bestScoreByMode: {
      ...DEFAULT_STATS.bestScoreByMode,
      ...(stats.bestScoreByMode ?? {})
    },
    challengeCompletion: stats.challengeCompletion ?? {},
    unlockedMaskColors: stats.unlockedMaskColors?.length ? stats.unlockedMaskColors : DEFAULT_STATS.unlockedMaskColors
  };
}

export function saveGoalieStats(stats: GoaliePersistentStats): void {
  try {
    window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // no-op
  }
}

const MASK_UNLOCKS: Array<{ threshold: number; color: string }> = [
  { threshold: 25, color: '#9df3ff' },
  { threshold: 80, color: '#ffe48f' },
  { threshold: 180, color: '#ffb8b0' },
  { threshold: 320, color: '#b9ffc5' }
];

export function updateStatsAfterMatch(
  current: GoaliePersistentStats,
  mode: GoalieMode,
  summary: {
    saves: number;
    perfectSaves: number;
    bestStreak: number;
    score: number;
    completedChallengeId?: string;
  }
): GoaliePersistentStats {
  const next: GoaliePersistentStats = {
    ...current,
    bestStreak: Math.max(current.bestStreak, summary.bestStreak),
    totalSaves: current.totalSaves + summary.saves,
    perfectSaves: current.perfectSaves + summary.perfectSaves,
    bestScoreByMode: {
      ...current.bestScoreByMode,
      [mode]: Math.max(current.bestScoreByMode[mode], summary.score)
    },
    lastRankedScore: mode === 'ranked' ? summary.score : current.lastRankedScore,
    bestRankedScore: mode === 'ranked' ? Math.max(current.bestRankedScore, summary.score) : current.bestRankedScore,
    rankedTier: mode === 'ranked' ? resolveRankTier(summary.score) : current.rankedTier,
    challengeCompletion: {
      ...current.challengeCompletion
    },
    unlockedMaskColors: [...current.unlockedMaskColors]
  };

  if (summary.completedChallengeId) {
    next.challengeCompletion[summary.completedChallengeId] = true;
  }

  for (let i = 0; i < MASK_UNLOCKS.length; i += 1) {
    const unlock = MASK_UNLOCKS[i];
    if (next.totalSaves >= unlock.threshold && !next.unlockedMaskColors.includes(unlock.color)) {
      next.unlockedMaskColors.push(unlock.color);
    }
  }

  return next;
}

export function toChallengeProgress(stats: GoaliePersistentStats): ChallengeProgress {
  return {
    completed: { ...stats.challengeCompletion }
  };
}
