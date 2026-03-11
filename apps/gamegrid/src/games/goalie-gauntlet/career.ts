import rawCareer from '../../content/goalie-gauntlet-career.json';
import { createSeededRng } from './rng';
import type { GoalieDifficulty } from './types';

export type CareerOpponentTier = 'bronze' | 'silver' | 'gold' | 'elite';
export type CareerObjectiveType = 'save_target' | 'goals_under' | 'streak_target' | 'sudden_death';
export type SeasonLadderTier = 'Rookie' | 'Semi-Pro' | 'Pro' | 'All-Star' | 'Legend';

export interface CareerObjective {
  type: CareerObjectiveType;
  savesTarget?: number;
  maxGoals?: number;
  streakTarget?: number;
  lives?: number;
}

export interface CareerMatchTemplate {
  id: string;
  name: string;
  patternId: string;
  opponentTier: CareerOpponentTier;
  shotCount: number;
  objective: CareerObjective;
}

export interface CareerOpponentTierDefinition {
  id: CareerOpponentTier;
  label: string;
  difficulty: GoalieDifficulty;
  ratingBase: number;
}

export interface CareerCatalog {
  opponentTiers: CareerOpponentTierDefinition[];
  matchTemplates: CareerMatchTemplate[];
  finalsTemplates: CareerMatchTemplate[];
}

export interface CareerSeasonMatch {
  seasonMatchIndex: number;
  isFinals: boolean;
  template: CareerMatchTemplate;
  difficulty: GoalieDifficulty;
}

export interface CareerSeasonSchedule {
  seasonKey: string;
  profileSeed: number;
  matches: CareerSeasonMatch[];
}

export interface CareerSeasonSummary {
  seasonKey: string;
  completedMatches: number;
  wins: number;
  losses: number;
  ratingEarned: number;
  bestStreak: number;
  totalScore: number;
  completedAtIso: string;
}

export interface CareerObjectivePerformance {
  saves: number;
  goalsAllowed: number;
  bestStreak: number;
  alive: boolean;
}

function asTier(value: unknown): CareerOpponentTier | null {
  if (value === 'bronze' || value === 'silver' || value === 'gold' || value === 'elite') return value;
  return null;
}

function asDifficulty(value: unknown): GoalieDifficulty | null {
  if (value === 'easy' || value === 'medium' || value === 'hard') return value;
  return null;
}

function validateObjective(value: unknown): value is CareerObjective {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  const type = rec.type;
  if (type !== 'save_target' && type !== 'goals_under' && type !== 'streak_target' && type !== 'sudden_death') return false;
  if (typeof rec.savesTarget !== 'undefined' && typeof rec.savesTarget !== 'number') return false;
  if (typeof rec.maxGoals !== 'undefined' && typeof rec.maxGoals !== 'number') return false;
  if (typeof rec.streakTarget !== 'undefined' && typeof rec.streakTarget !== 'number') return false;
  if (typeof rec.lives !== 'undefined' && typeof rec.lives !== 'number') return false;
  return true;
}

function validateTemplate(value: unknown): value is CareerMatchTemplate {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.id === 'string' &&
    rec.id.length > 0 &&
    typeof rec.name === 'string' &&
    rec.name.length > 0 &&
    typeof rec.patternId === 'string' &&
    rec.patternId.length > 0 &&
    asTier(rec.opponentTier) !== null &&
    typeof rec.shotCount === 'number' &&
    rec.shotCount >= 8 &&
    rec.shotCount <= 40 &&
    validateObjective(rec.objective)
  );
}

export function loadCareerCatalog(): CareerCatalog {
  const parsed = rawCareer as unknown;
  if (!parsed || typeof parsed !== 'object') throw new Error('goalie-gauntlet-career.json must export object');
  const rec = parsed as Record<string, unknown>;
  const tiers = Array.isArray(rec.opponentTiers) ? rec.opponentTiers : [];
  const templates = Array.isArray(rec.matchTemplates) ? rec.matchTemplates : [];
  const finals = Array.isArray(rec.finalsTemplates) ? rec.finalsTemplates : [];

  const opponentTiers = tiers
    .map((entry) => {
      const t = entry as Record<string, unknown>;
      const id = asTier(t.id);
      const diff = asDifficulty(t.difficulty);
      if (!id || !diff || typeof t.label !== 'string' || typeof t.ratingBase !== 'number') return null;
      return {
        id,
        label: t.label,
        difficulty: diff,
        ratingBase: t.ratingBase
      } as CareerOpponentTierDefinition;
    })
    .filter((entry): entry is CareerOpponentTierDefinition => entry !== null);

  const matchTemplates = templates.filter(validateTemplate);
  const finalsTemplates = finals.filter(validateTemplate);

  if (matchTemplates.length < 24) {
    throw new Error(`goalie-gauntlet-career.json needs at least 24 match templates; found ${matchTemplates.length}`);
  }
  if (finalsTemplates.length < 2) {
    throw new Error('goalie-gauntlet-career.json needs at least 2 finals templates');
  }

  return { opponentTiers, matchTemplates, finalsTemplates };
}

function ladderTierForMatch(index: number): CareerOpponentTier {
  if (index <= 2) return 'bronze';
  if (index <= 5) return 'silver';
  if (index <= 8) return 'gold';
  return 'elite';
}

function tierDifficulty(catalog: CareerCatalog, tier: CareerOpponentTier): GoalieDifficulty {
  return catalog.opponentTiers.find((entry) => entry.id === tier)?.difficulty ?? 'medium';
}

export function utcWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function generateCareerSeason(catalog: CareerCatalog, seasonKey: string, profileSeed: number): CareerSeasonSchedule {
  const rng = createSeededRng(`career:${seasonKey}:${profileSeed}`);
  const selectedIds = new Set<string>();
  const matches: CareerSeasonMatch[] = [];

  for (let i = 0; i < 11; i += 1) {
    const tier = ladderTierForMatch(i);
    const pool = catalog.matchTemplates.filter((entry) => entry.opponentTier === tier && !selectedIds.has(entry.id));
    const fallback = catalog.matchTemplates.filter((entry) => entry.opponentTier === tier);
    const pickPool = pool.length > 0 ? pool : fallback;
    const template = pickPool[rng.nextInt(pickPool.length)];
    selectedIds.add(template.id);
    matches.push({
      seasonMatchIndex: i,
      isFinals: false,
      template,
      difficulty: tierDifficulty(catalog, tier)
    });
  }

  const finals = catalog.finalsTemplates[rng.nextInt(catalog.finalsTemplates.length)];
  matches.push({
    seasonMatchIndex: 11,
    isFinals: true,
    template: finals,
    difficulty: 'hard'
  });

  return {
    seasonKey,
    profileSeed,
    matches
  };
}

export function evaluateCareerObjective(objective: CareerObjective, performance: CareerObjectivePerformance): boolean {
  if (objective.type === 'save_target') {
    return performance.saves >= (objective.savesTarget ?? 0);
  }
  if (objective.type === 'goals_under') {
    return performance.goalsAllowed <= (objective.maxGoals ?? 0);
  }
  if (objective.type === 'streak_target') {
    return performance.bestStreak >= (objective.streakTarget ?? 0);
  }
  if (objective.type === 'sudden_death') {
    const lives = objective.lives ?? 1;
    return performance.alive && performance.goalsAllowed < lives;
  }
  return false;
}

export function calculateSeasonRatingDelta(args: {
  tier: CareerOpponentTier;
  objectivePassed: boolean;
  goalsAllowed: number;
  bestStreak: number;
  perfectRate: number;
  isFinals?: boolean;
}): number {
  const base = args.tier === 'bronze' ? 85 : args.tier === 'silver' ? 130 : args.tier === 'gold' ? 180 : 240;
  const objective = args.objectivePassed ? 55 : -30;
  const goalsPenalty = Math.min(90, args.goalsAllowed * 14);
  const streakBonus = Math.min(48, args.bestStreak * 4);
  const perfectBonus = Math.round(Math.max(0, Math.min(1, args.perfectRate)) * 35);
  const finals = args.isFinals ? 45 : 0;
  return Math.max(5, base + objective + streakBonus + perfectBonus + finals - goalsPenalty);
}

export function resolveSeasonLadderTier(rating: number): SeasonLadderTier {
  if (rating >= 3600) return 'Legend';
  if (rating >= 2400) return 'All-Star';
  if (rating >= 1500) return 'Pro';
  if (rating >= 700) return 'Semi-Pro';
  return 'Rookie';
}
