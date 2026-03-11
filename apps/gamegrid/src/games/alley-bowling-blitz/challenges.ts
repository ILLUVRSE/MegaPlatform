import rawChallenges from '../../content/bowling-challenges.json';
import type {
  BowlingChallenge,
  BowlingChallengeCatalog,
  ChallengeEvaluation,
  ChallengeProgress,
  ChallengeRuntimeStats
} from './types';

const STORAGE_KEY = 'gamegrid.alley-bowling-blitz.challenges.v1';

function isGoal(value: unknown): value is BowlingChallenge['goal'] {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  if (rec.type === 'strike_streak') return typeof rec.required === 'number' && rec.required > 0;
  if (rec.type === 'spares_in_frames') {
    return (
      typeof rec.required === 'number' &&
      rec.required > 0 &&
      typeof rec.frameWindow === 'number' &&
      rec.frameWindow > 0
    );
  }
  if (rec.type === 'knock_total' || rec.type === 'score_min') {
    return typeof rec.required === 'number' && rec.required > 0;
  }
  if (rec.type === 'split_convert') {
    return (
      (rec.split === '7-10' || rec.split === 'bucket') &&
      typeof rec.required === 'number' &&
      rec.required > 0
    );
  }
  return false;
}

function isChallenge(value: unknown): value is BowlingChallenge {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.id === 'string' &&
    rec.id.length > 0 &&
    typeof rec.name === 'string' &&
    rec.name.length > 0 &&
    typeof rec.description === 'string' &&
    rec.description.length > 0 &&
    Array.isArray(rec.startingPins) &&
    rec.startingPins.length > 0 &&
    rec.startingPins.every((pin) => typeof pin === 'number' && pin >= 1 && pin <= 10) &&
    typeof rec.rollLimit === 'number' &&
    rec.rollLimit > 0 &&
    isGoal(rec.goal)
  );
}

export function loadBowlingChallenges(): BowlingChallengeCatalog {
  const parsed = rawChallenges as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('bowling-challenges.json must export an array');
  }

  const challenges = parsed.filter(isChallenge);
  if (challenges.length < 10) {
    throw new Error(`Alley Bowling Blitz requires at least 10 valid challenges. Found ${challenges.length}.`);
  }

  const ids = new Set<string>();
  for (let i = 0; i < challenges.length; i += 1) {
    const id = challenges[i].id;
    if (ids.has(id)) throw new Error(`Duplicate bowling challenge id: ${id}`);
    ids.add(id);
  }

  return { challenges };
}

export function evaluateChallenge(challenge: BowlingChallenge, stats: ChallengeRuntimeStats): ChallengeEvaluation {
  let passed = false;

  switch (challenge.goal.type) {
    case 'strike_streak':
      passed = stats.strikeStreakMax >= challenge.goal.required;
      break;
    case 'spares_in_frames':
      passed = stats.sparesInWindow >= challenge.goal.required;
      break;
    case 'knock_total':
      passed = stats.totalPinsKnocked >= challenge.goal.required;
      break;
    case 'score_min':
      passed = stats.score >= challenge.goal.required;
      break;
    case 'split_convert':
      passed = stats.splitConverted[challenge.goal.split] >= challenge.goal.required;
      break;
  }

  return {
    passed,
    failed: !passed && stats.rollsUsed >= challenge.rollLimit
  };
}

export function loadChallengeProgress(): ChallengeProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completed: {} };
    const parsed = JSON.parse(raw) as Partial<ChallengeProgress>;
    return { completed: parsed.completed ?? {} };
  } catch {
    return { completed: {} };
  }
}

export function saveChallengeProgress(progress: ChallengeProgress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // no-op
  }
}
