import rawChallenges from '../../content/goalie-gauntlet-challenges.json';
import { createSeededRng } from './rng';
import type { ChallengeCatalog, ChallengeDefinition } from './types';

function isDifficulty(value: unknown): value is ChallengeDefinition['difficulty'] {
  return value === 'easy' || value === 'medium' || value === 'hard';
}

function isChallenge(value: unknown): value is ChallengeDefinition {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  const win = rec.win as Record<string, unknown> | undefined;

  return (
    typeof rec.id === 'string' &&
    rec.id.length > 0 &&
    typeof rec.name === 'string' &&
    rec.name.length > 0 &&
    typeof rec.description === 'string' &&
    rec.description.length > 0 &&
    typeof rec.patternId === 'string' &&
    rec.patternId.length > 0 &&
    isDifficulty(rec.difficulty) &&
    typeof rec.shotCount === 'number' &&
    rec.shotCount >= 6 &&
    rec.shotCount <= 120 &&
    !!win &&
    typeof win === 'object' &&
    (typeof win.minSaves === 'undefined' || typeof win.minSaves === 'number') &&
    (typeof win.maxMisses === 'undefined' || typeof win.maxMisses === 'number') &&
    (typeof win.minPerfect === 'undefined' || typeof win.minPerfect === 'number') &&
    (typeof win.minPerfectStreak === 'undefined' || typeof win.minPerfectStreak === 'number') &&
    (typeof win.maxLate === 'undefined' || typeof win.maxLate === 'number') &&
    (typeof win.maxTimeMs === 'undefined' || typeof win.maxTimeMs === 'number')
  );
}

export function loadGoalieChallenges(): ChallengeCatalog {
  const parsed = rawChallenges as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('goalie-gauntlet-challenges.json must export an array');
  }

  const challenges = parsed.filter(isChallenge);
  if (challenges.length < 12) {
    throw new Error(`Goalie challenge ladder requires at least 12 valid entries. Found ${challenges.length}`);
  }

  const seen = new Set<string>();
  for (let i = 0; i < challenges.length; i += 1) {
    const challenge = challenges[i];
    if (seen.has(challenge.id)) {
      throw new Error(`Duplicate challenge id: ${challenge.id}`);
    }
    seen.add(challenge.id);
  }

  return { challenges };
}

export function evaluateChallenge(
  challenge: ChallengeDefinition,
  stats: {
    saves: number;
    misses: number;
    perfectSaves: number;
    lateSaves: number;
    bestPerfectStreak: number;
    elapsedMs: number;
  }
): { passed: boolean; failed: boolean } {
  const win = challenge.win;

  const failedByMisses = typeof win.maxMisses === 'number' && stats.misses > win.maxMisses;
  const failedByLate = typeof win.maxLate === 'number' && stats.lateSaves > win.maxLate;
  const failedByTime = typeof win.maxTimeMs === 'number' && stats.elapsedMs > win.maxTimeMs;
  const failed = failedByMisses || failedByLate || failedByTime;

  const passed =
    !failed &&
    (typeof win.minSaves !== 'number' || stats.saves >= win.minSaves) &&
    (typeof win.minPerfect !== 'number' || stats.perfectSaves >= win.minPerfect) &&
    (typeof win.minPerfectStreak !== 'number' || stats.bestPerfectStreak >= win.minPerfectStreak);

  return { passed, failed };
}

export function utcDayKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDailyChallenge(challenges: readonly ChallengeDefinition[], dayKey = utcDayKey()): ChallengeDefinition {
  const rng = createSeededRng(`daily:${dayKey}`);
  return challenges[rng.nextInt(challenges.length)];
}
