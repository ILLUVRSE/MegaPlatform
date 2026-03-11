import {
  DEFAULT_SCORE_CONFIG,
  type GoalieDifficulty,
  type GoalieInputState,
  type GoalieSetup,
  type MatchState,
  type SaveActionType,
  type SaveGrade,
  type ScheduledShot,
  type ScoreConfig,
  type ShotResolution,
  type TimingWindows
} from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function emptyStats() {
  return {
    shotsFaced: 0,
    saves: 0,
    misses: 0,
    perfectSaves: 0,
    goodSaves: 0,
    lateSaves: 0,
    pokeChecks: 0,
    gloveSnags: 0,
    desperationDives: 0,
    reboundsFaced: 0,
    reboundsSaved: 0,
    streakProtectionsUsed: 0,
    streak: 0,
    bestStreak: 0
  };
}

function streakMultiplier(streak: number, scoring: ScoreConfig): number {
  const clamped = Math.min(streak, scoring.streakCap);
  return Math.min(scoring.multiplierCap, 1 + clamped * scoring.streakStep);
}

export function createMatchState(setup: GoalieSetup): MatchState {
  return {
    mode: setup.mode,
    difficulty: setup.difficulty,
    score: 0,
    lives: setup.mode === 'survival' ? 3 : Number.POSITIVE_INFINITY,
    elapsedMs: 0,
    ended: false,
    streakMultiplier: 1,
    streakProtectionCharges: 0,
    stats: emptyStats()
  };
}

export function tickMatch(state: MatchState, deltaMs: number): MatchState {
  if (state.ended) return state;
  return {
    ...state,
    elapsedMs: state.elapsedMs + Math.max(0, deltaMs)
  };
}

export function getTimingWindows(difficulty: GoalieDifficulty, shotIndex: number): TimingWindows {
  const base = difficulty === 'hard' ? 0.9 : difficulty === 'medium' ? 1 : 1.08;
  const scaling = clamp(1 - shotIndex * 0.0045, 0.72, 1);
  const scale = base * scaling;
  return {
    perfectEarlyMinMs: Math.round(-145 * scale),
    perfectEarlyMaxMs: Math.round(-30 * scale),
    goodMinMs: Math.round(-270 * scale),
    goodMaxMs: Math.round(95 * scale),
    lateMaxMs: Math.round(190 * scale)
  };
}

export function resolveSaveGrade(
  shot: ScheduledShot,
  input: GoalieInputState,
  difficulty: GoalieDifficulty,
  shotIndex: number
): { grade: SaveGrade; deltaMs: number; actionType: SaveActionType } {
  const actionType = input.actionType ?? 'standard';
  const coveredZones = input.coveredZones ?? [input.zone];
  const inCoverage = actionType === 'desperation_dive' ? coveredZones.includes(shot.zone) : input.zone === shot.zone;

  if (!inCoverage) {
    return { grade: 'MISS', deltaMs: Number.POSITIVE_INFINITY, actionType };
  }

  const deltaMs = Math.round(input.changedAtMs - shot.arriveAtMs);

  if (shot.fake && shot.fakeShiftAtMs !== null) {
    const shiftAtMs = shot.telegraphAtMs + shot.fakeShiftAtMs;
    if (input.changedAtMs < shiftAtMs - 120) {
      return { grade: 'MISS', deltaMs, actionType };
    }
  }

  if (actionType === 'poke_check') {
    if (!shot.zone.startsWith('low')) {
      return { grade: 'MISS', deltaMs, actionType };
    }
    if (deltaMs >= -120 && deltaMs <= -55) {
      return { grade: 'PERFECT', deltaMs, actionType };
    }
    if (deltaMs >= -190 && deltaMs <= -25) {
      return { grade: 'GOOD', deltaMs, actionType };
    }
    return { grade: 'MISS', deltaMs, actionType };
  }

  if (actionType === 'glove_snag') {
    if (!shot.zone.startsWith('high') || (input.holdDurationMs ?? 0) < 220) {
      return { grade: 'MISS', deltaMs, actionType };
    }
    if (deltaMs >= -170 && deltaMs <= 0) {
      return { grade: 'PERFECT', deltaMs, actionType };
    }
    if (deltaMs >= -260 && deltaMs <= 85) {
      return { grade: 'GOOD', deltaMs, actionType };
    }
    return { grade: 'MISS', deltaMs, actionType };
  }

  const windows = getTimingWindows(difficulty, shotIndex);

  if (actionType === 'desperation_dive') {
    if (deltaMs >= windows.perfectEarlyMinMs - 40 && deltaMs <= windows.perfectEarlyMaxMs + 30) {
      return { grade: 'PERFECT', deltaMs, actionType };
    }
    if (deltaMs >= windows.goodMinMs - 45 && deltaMs <= windows.goodMaxMs + 30) {
      return { grade: 'GOOD', deltaMs, actionType };
    }
    if (deltaMs > windows.goodMaxMs + 30 && deltaMs <= windows.lateMaxMs + 35) {
      return { grade: 'LATE', deltaMs, actionType };
    }
    return { grade: 'MISS', deltaMs, actionType };
  }

  if (deltaMs >= windows.perfectEarlyMinMs && deltaMs <= windows.perfectEarlyMaxMs) {
    return { grade: 'PERFECT', deltaMs, actionType };
  }

  if (deltaMs >= windows.goodMinMs && deltaMs <= windows.goodMaxMs) {
    return { grade: 'GOOD', deltaMs, actionType };
  }

  if (deltaMs > windows.goodMaxMs && deltaMs <= windows.lateMaxMs) {
    return { grade: 'LATE', deltaMs, actionType };
  }

  return { grade: 'MISS', deltaMs, actionType };
}

function pointsForGrade(grade: SaveGrade, scoring: ScoreConfig): number {
  if (grade === 'PERFECT') return scoring.perfect;
  if (grade === 'GOOD') return scoring.good;
  if (grade === 'LATE') return scoring.late;
  return 0;
}

export function applyShotResolution(
  state: MatchState,
  shot: ScheduledShot,
  grade: SaveGrade,
  deltaMs: number,
  actionType: SaveActionType = 'standard',
  scoring: ScoreConfig = DEFAULT_SCORE_CONFIG
): { state: MatchState; resolution: ShotResolution } {
  if (state.ended) {
    return {
      state,
      resolution: {
        shotId: shot.id,
        zone: shot.zone,
        grade,
        actionType,
        deltaMs,
        points: 0,
        multiplier: state.streakMultiplier,
        streakAfter: state.stats.streak,
        lifeLost: false,
        streakProtectionApplied: false
      }
    };
  }

  const stats = { ...state.stats, shotsFaced: state.stats.shotsFaced + 1 };
  if (shot.rebound) stats.reboundsFaced += 1;
  let streak = stats.streak;
  let points = 0;
  let lifeLost = false;
  let streakProtectionApplied = false;

  if (grade === 'MISS') {
    stats.misses += 1;
    if (state.streakProtectionCharges > 0) {
      streakProtectionApplied = true;
      stats.streakProtectionsUsed += 1;
    } else {
      streak = 0;
    }
    lifeLost = state.mode === 'survival';
  } else if (grade === 'LATE') {
    stats.saves += 1;
    stats.lateSaves += 1;
    streak = 0;
    points = pointsForGrade(grade, scoring);
  } else {
    streak += 1;
    stats.saves += 1;
    if (grade === 'PERFECT') stats.perfectSaves += 1;
    if (grade === 'GOOD') stats.goodSaves += 1;
    points = Math.round(pointsForGrade(grade, scoring) * streakMultiplier(streak, scoring));
  }

  if (grade !== 'MISS' && shot.rebound) {
    stats.reboundsSaved += 1;
  }

  if (actionType === 'poke_check' && grade !== 'MISS') {
    stats.pokeChecks += 1;
    points += 40;
  } else if (actionType === 'glove_snag' && grade !== 'MISS') {
    stats.gloveSnags += 1;
    points += 30;
  } else if (actionType === 'desperation_dive') {
    stats.desperationDives += 1;
  }

  points = Math.round(points * Math.max(1, shot.scoreMultiplier || 1));

  stats.streak = streak;
  stats.bestStreak = Math.max(stats.bestStreak, streak);

  const streakProtectionCharges =
    actionType === 'glove_snag' && grade !== 'MISS'
      ? state.streakProtectionCharges + 1
      : streakProtectionApplied
        ? Math.max(0, state.streakProtectionCharges - 1)
        : state.streakProtectionCharges;

  const multiplier = streakMultiplier(streak, scoring);
  const nextState: MatchState = {
    ...state,
    score: state.score + points,
    lives: lifeLost ? Math.max(0, state.lives - 1) : state.lives,
    streakMultiplier: multiplier,
    streakProtectionCharges,
    stats
  };

  return {
    state: nextState,
    resolution: {
      shotId: shot.id,
      zone: shot.zone,
      grade,
      actionType,
      deltaMs,
      points,
      multiplier,
      streakAfter: streak,
      lifeLost,
      streakProtectionApplied
    }
  };
}

export function evaluateMatchEnd(state: MatchState): { ended: boolean; reason: 'lives' | 'time' | 'challenge' | null } {
  if (state.mode === 'survival' && state.lives <= 0) {
    return { ended: true, reason: 'lives' };
  }
  if (state.mode === 'time_attack' && state.elapsedMs >= 60_000) {
    return { ended: true, reason: 'time' };
  }
  return { ended: false, reason: null };
}

export function finalizeMatch(state: MatchState): MatchState {
  return {
    ...state,
    ended: true
  };
}

export function getStreakMultiplier(streak: number, scoring: ScoreConfig = DEFAULT_SCORE_CONFIG): number {
  return streakMultiplier(streak, scoring);
}
