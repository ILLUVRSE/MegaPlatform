import { hashSeed } from './rng';
import { levelFromXp } from './currency';
import { defaultCosmeticProfile, loadCosmeticsCatalog, type CosmeticType } from './cosmetics';
import { resolveSeasonLadderTier, utcWeekKey, type CareerSeasonSummary, type SeasonLadderTier } from './career';

const PROFILE_KEY = 'gamegrid.goalie-gauntlet.progression.v1';

export interface GoalieCareerProgress {
  currentSeasonKey: string;
  currentMatchIndex: number;
  seasonHistory: CareerSeasonSummary[];
  seasonWins: number;
  seasonLosses: number;
}

export interface GoalieProgressionProfile {
  profileSeed: number;
  coins: number;
  xp: number;
  level: number;
  seasonRating: number;
  seasonTier: SeasonLadderTier;
  career: GoalieCareerProgress;
  unlockedCosmetics: string[];
  equippedCosmetics: Record<CosmeticType, string>;
  achievements: Record<string, boolean>;
  badges: string[];
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as Record<string, unknown>) } as T;
  } catch {
    return fallback;
  }
}

function defaultProfileSeed(): number {
  return hashSeed('goalie-gauntlet-profile-seed');
}

export function defaultProgressionProfile(): GoalieProgressionProfile {
  const cosmetic = defaultCosmeticProfile(loadCosmeticsCatalog());
  return {
    profileSeed: defaultProfileSeed(),
    coins: 0,
    xp: 0,
    level: 1,
    seasonRating: 0,
    seasonTier: 'Rookie',
    career: {
      currentSeasonKey: utcWeekKey(),
      currentMatchIndex: 0,
      seasonHistory: [],
      seasonWins: 0,
      seasonLosses: 0
    },
    unlockedCosmetics: [...cosmetic.unlockedCosmetics],
    equippedCosmetics: { ...cosmetic.equippedCosmetics },
    achievements: {},
    badges: []
  };
}

export function loadGoalieProgression(): GoalieProgressionProfile {
  const fallback = defaultProgressionProfile();
  const loaded = readJson<GoalieProgressionProfile>(PROFILE_KEY, fallback);
  return {
    ...fallback,
    ...loaded,
    level: levelFromXp(typeof loaded.xp === 'number' ? loaded.xp : fallback.xp),
    seasonTier: resolveSeasonLadderTier(typeof loaded.seasonRating === 'number' ? loaded.seasonRating : fallback.seasonRating),
    career: {
      ...fallback.career,
      ...(loaded.career ?? {}),
      seasonHistory: Array.isArray(loaded.career?.seasonHistory) ? loaded.career.seasonHistory.slice(0, 5) : []
    },
    unlockedCosmetics: Array.isArray(loaded.unlockedCosmetics) && loaded.unlockedCosmetics.length > 0 ? loaded.unlockedCosmetics : fallback.unlockedCosmetics,
    equippedCosmetics: {
      ...fallback.equippedCosmetics,
      ...(loaded.equippedCosmetics ?? {})
    },
    achievements: loaded.achievements ?? {},
    badges: Array.isArray(loaded.badges) ? loaded.badges : []
  };
}

export function saveGoalieProgression(profile: GoalieProgressionProfile): void {
  const sanitized: GoalieProgressionProfile = {
    ...profile,
    level: levelFromXp(profile.xp),
    seasonTier: resolveSeasonLadderTier(profile.seasonRating),
    career: {
      ...profile.career,
      seasonHistory: profile.career.seasonHistory.slice(0, 5)
    }
  };
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(sanitized));
  } catch {
    // no-op
  }
}

export function applyRewardsToProgression(
  profile: GoalieProgressionProfile,
  reward: { coins: number; xp: number }
): GoalieProgressionProfile {
  const xp = Math.max(0, profile.xp + Math.max(0, reward.xp));
  return {
    ...profile,
    coins: Math.max(0, profile.coins + Math.max(0, reward.coins)),
    xp,
    level: levelFromXp(xp)
  };
}

export function ensureSeason(profile: GoalieProgressionProfile, seasonKey: string): GoalieProgressionProfile {
  if (profile.career.currentSeasonKey === seasonKey) return profile;
  return {
    ...profile,
    career: {
      ...profile.career,
      currentSeasonKey: seasonKey,
      currentMatchIndex: 0,
      seasonWins: 0,
      seasonLosses: 0
    }
  };
}

export function recordCareerMatchResult(
  profile: GoalieProgressionProfile,
  result: {
    seasonKey: string;
    completedMatchesInSeason: number;
    won: boolean;
    ratingDelta: number;
    bestStreak: number;
    score: number;
    seasonComplete: boolean;
  }
): GoalieProgressionProfile {
  const wins = profile.career.seasonWins + (result.won ? 1 : 0);
  const losses = profile.career.seasonLosses + (result.won ? 0 : 1);
  const nextRating = Math.max(0, profile.seasonRating + result.ratingDelta);

  const history = [...profile.career.seasonHistory];
  if (result.seasonComplete) {
    history.unshift({
      seasonKey: result.seasonKey,
      completedMatches: result.completedMatchesInSeason,
      wins,
      losses,
      ratingEarned: result.ratingDelta,
      bestStreak: result.bestStreak,
      totalScore: result.score,
      completedAtIso: new Date().toISOString()
    });
  }

  return {
    ...profile,
    seasonRating: nextRating,
    seasonTier: resolveSeasonLadderTier(nextRating),
    career: {
      ...profile.career,
      currentSeasonKey: result.seasonKey,
      currentMatchIndex: result.seasonComplete ? 0 : profile.career.currentMatchIndex + 1,
      seasonWins: result.seasonComplete ? 0 : wins,
      seasonLosses: result.seasonComplete ? 0 : losses,
      seasonHistory: history.slice(0, 5)
    }
  };
}
