import {
  DEFAULT_SCORING,
  type MatchState,
  type PenaltyDifficulty,
  type PenaltyMode,
  type PenaltySetup,
  type PenaltyStats,
  type ScoringConfig,
  type ShotResolution,
  type ZoneStats
} from './types';

function createZone(): ZoneStats {
  return { attempts: 0, goals: 0 };
}

export function createEmptyStats(): PenaltyStats {
  return {
    goals: 0,
    savesAgainst: 0,
    missesWide: 0,
    missesHigh: 0,
    postHits: 0,
    streak: 0,
    bestStreak: 0,
    totalShots: 0,
    zone: {
      left: createZone(),
      center: createZone(),
      right: createZone()
    }
  };
}

export function resolveLadderDifficulty(round: number): PenaltyDifficulty {
  if (round <= 3) return 'easy';
  if (round <= 7) return 'medium';
  return 'hard';
}

function initialShotsRemaining(mode: PenaltyMode): number {
  if (mode === 'classic_5') return 5;
  if (mode === 'pressure_ladder') return 10;
  return Number.POSITIVE_INFINITY;
}

export function createInitialMatchState(setup: PenaltySetup): MatchState {
  return {
    mode: setup.mode,
    round: 1,
    shotsTaken: 0,
    shotsRemaining: initialShotsRemaining(setup.mode),
    ended: false,
    score: 0,
    streak: 0,
    bestStreak: 0,
    effectiveDifficulty: setup.mode === 'pressure_ladder' ? resolveLadderDifficulty(1) : setup.difficulty,
    stats: createEmptyStats()
  };
}

export function applyShotToMatch(
  state: MatchState,
  shot: ShotResolution,
  scoring: ScoringConfig = DEFAULT_SCORING
): MatchState {
  if (state.ended) return state;

  const goals = state.stats.goals + (shot.result === 'goal' ? 1 : 0);
  const savesAgainst = state.stats.savesAgainst + (shot.result === 'saved' ? 1 : 0);
  const missesWide = state.stats.missesWide + (shot.result === 'wide' ? 1 : 0);
  const missesHigh = state.stats.missesHigh + (shot.result === 'high' ? 1 : 0);
  const postHits = state.stats.postHits + (shot.result === 'post' ? 1 : 0);

  const zone = state.stats.zone[shot.zone];
  const nextZone: ZoneStats = {
    attempts: zone.attempts + 1,
    goals: zone.goals + (shot.result === 'goal' ? 1 : 0)
  };

  const streak = shot.result === 'goal' ? state.streak + 1 : 0;
  const bestStreak = Math.max(state.bestStreak, streak);
  const shotsTaken = state.shotsTaken + 1;
  const round = state.round + 1;

  let scoreGain = shot.pointsAwarded;
  if (state.mode === 'pressure_ladder' && shot.result === 'goal') {
    scoreGain += Math.max(0, state.round - 1) * scoring.ladderRoundBonusStep;
  }

  let ended = false;
  if (state.mode === 'classic_5') ended = shotsTaken >= 5;
  else if (state.mode === 'sudden_death') ended = shot.result !== 'goal';
  else if (state.mode === 'pressure_ladder') ended = shotsTaken >= 10;

  const effectiveDifficulty =
    state.mode === 'pressure_ladder' ? resolveLadderDifficulty(round) : state.effectiveDifficulty;

  return {
    ...state,
    round,
    shotsTaken,
    shotsRemaining:
      state.mode === 'classic_5'
        ? Math.max(0, 5 - shotsTaken)
        : state.mode === 'pressure_ladder'
          ? Math.max(0, 10 - shotsTaken)
          : Number.POSITIVE_INFINITY,
    ended,
    score: state.score + scoreGain,
    streak,
    bestStreak,
    effectiveDifficulty,
    stats: {
      goals,
      savesAgainst,
      missesWide,
      missesHigh,
      postHits,
      streak,
      bestStreak,
      totalShots: shotsTaken,
      zone: {
        ...state.stats.zone,
        [shot.zone]: nextZone
      }
    }
  };
}

export function computeAccuracy(state: MatchState): number {
  if (state.stats.totalShots <= 0) return 0;
  return state.stats.goals / state.stats.totalShots;
}

export function buildShotResolution(
  result: ShotResolution['result'],
  pointsAwarded: number,
  zone: ShotResolution['zone'],
  cornerGoal = false,
  perfectShot = false
): ShotResolution {
  return {
    result,
    finalX: 0,
    finalY: 0,
    keeperSaved: result === 'saved',
    cornerGoal,
    perfectShot,
    pointsAwarded,
    zone
  };
}
