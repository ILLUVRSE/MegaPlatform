import { buildShotSchedule, type ShotSchedule } from './patterns';
import { utcDayKey } from './challenges';
import { createSeededRng } from './rng';
import type { GoalieDifficulty, GoalieMode, ScheduledShot, ShotPatternCatalog } from './types';

export type RankedTier = 'Bronze' | 'Silver' | 'Gold' | 'Elite' | 'Legendary';

export interface RankedRoundDefinition {
  round: number;
  seed: number;
  patternId: string;
  difficulty: GoalieDifficulty;
  shotCount: number;
}

export interface RankedRunDefinition {
  mode: GoalieMode;
  dayKey: string;
  seed: number;
  rounds: RankedRoundDefinition[];
}

const RANKED_ROUNDS = 10;
const SHOTS_PER_ROUND = 10;

const TIER_THRESHOLDS: Array<{ tier: RankedTier; minScore: number }> = [
  { tier: 'Legendary', minScore: 14000 },
  { tier: 'Elite', minScore: 10000 },
  { tier: 'Gold', minScore: 7000 },
  { tier: 'Silver', minScore: 4000 },
  { tier: 'Bronze', minScore: 0 }
];

function hashToSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function resolveRankTier(score: number): RankedTier {
  for (let i = 0; i < TIER_THRESHOLDS.length; i += 1) {
    const threshold = TIER_THRESHOLDS[i];
    if (score >= threshold.minScore) return threshold.tier;
  }
  return 'Bronze';
}

export function createRankedRun(catalog: ShotPatternCatalog, dayKey = utcDayKey()): RankedRunDefinition {
  const seed = hashToSeed(`goalie-ranked:${dayKey}`);
  const rng = createSeededRng(`goalie-ranked-rounds:${dayKey}`);
  const rounds: RankedRoundDefinition[] = [];
  const ids = catalog.patterns.map((pattern) => pattern.id);

  for (let round = 0; round < RANKED_ROUNDS; round += 1) {
    const patternId = ids[rng.nextInt(ids.length)];
    const difficulty: GoalieDifficulty = round < 3 ? 'medium' : round < 7 ? 'hard' : 'hard';
    rounds.push({
      round,
      seed: hashToSeed(`${dayKey}:round:${round}`),
      patternId,
      difficulty,
      shotCount: SHOTS_PER_ROUND
    });
  }

  return {
    mode: 'ranked',
    dayKey,
    seed,
    rounds
  };
}

export function buildRankedSchedule(catalog: ShotPatternCatalog, dayKey = utcDayKey()): ShotSchedule {
  const run = createRankedRun(catalog, dayKey);
  const shots: ScheduledShot[] = [];
  let cursorMs = 300;

  for (let i = 0; i < run.rounds.length; i += 1) {
    const round = run.rounds[i];
    const schedule = buildShotSchedule(catalog, {
      seed: round.seed,
      mode: 'challenge',
      difficulty: round.difficulty,
      patternId: round.patternId,
      shotCount: round.shotCount
    });

    const firstTelegraph = schedule.shots[0]?.telegraphAtMs ?? 0;
    let lastArrive = cursorMs;

    for (let j = 0; j < schedule.shots.length; j += 1) {
      const base = schedule.shots[j];
      const offset = cursorMs - firstTelegraph;
      const shot: ScheduledShot = {
        ...base,
        id: shots.length,
        sequenceIndex: shots.length,
        roundIndex: i,
        telegraphAtMs: Math.round(base.telegraphAtMs + offset),
        spawnAtMs: Math.round(base.spawnAtMs + offset),
        arriveAtMs: Math.round(base.arriveAtMs + offset)
      };
      lastArrive = shot.arriveAtMs;
      shots.push(shot);
    }

    cursorMs = lastArrive + 820;
  }

  return {
    patternId: `ranked:${run.dayKey}`,
    shots,
    timingScale: 0.9
  };
}
