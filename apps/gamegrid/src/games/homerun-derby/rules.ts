import { type MatchEndSummary, type MatchState, type HomerunMode, type MatchStats, type OutcomeContext } from './types';
import type { ScoringTuning } from './config/tuning';
import { DEFAULT_TUNING, clamp } from './config/tuning';

const CLASSIC_PITCHES = 10;
const DUEL_PITCHES = 10;
const TIMED_MS = 60000;

function createInitialStats(): MatchStats {
  return {
    score: 0,
    hrCount: 0,
    bestDistance: 0,
    perfectCount: 0,
    strikeouts: 0,
    streak: 0,
    multiplier: 1
  };
}

export function createMatchState(mode: HomerunMode): MatchState {
  if (mode === 'classic_10') {
    return {
      mode,
      state: {
        kind: 'classic_10',
        pitchesThrown: 0,
        pitchesRemaining: CLASSIC_PITCHES,
        ended: false
      },
      stats: createInitialStats()
    };
  }

  if (mode === 'timed_60') {
    return {
      mode,
      state: {
        kind: 'timed_60',
        timeRemainingMs: TIMED_MS,
        ended: false
      },
      stats: createInitialStats()
    };
  }

  return {
    mode,
    state: {
      kind: 'duel_10',
      phase: 'player',
      playerPitchesThrown: 0,
      aiPitchesThrown: 0,
      playerScore: 0,
      aiScore: 0,
      ended: false
    },
    stats: createInitialStats()
  };
}

export function tickMatch(state: MatchState, deltaMs: number): MatchState {
  if (state.state.kind !== 'timed_60' || state.state.ended) return state;

  const nextTime = clamp(state.state.timeRemainingMs - deltaMs, 0, TIMED_MS);
  return {
    ...state,
    state: {
      ...state.state,
      timeRemainingMs: nextTime,
      ended: nextTime <= 0
    }
  };
}

function updateStats(stats: MatchStats, outcome: OutcomeContext, tuning: ScoringTuning): MatchStats {
  const distance = outcome.swing.flight.distanceFt;
  const isHr = outcome.swing.flight.isHomeRun;
  const nextStreak = isHr ? stats.streak + 1 : 0;
  const multiplier = isHr ? clamp(nextStreak, 1, tuning.multiplierCap) : 1;
  const distanceBonus = Math.max(0, Math.floor((distance - tuning.distanceBonusStart) * tuning.distanceBonusScale));
  const scoreGain = isHr ? (tuning.hrBaseScore + distanceBonus) * multiplier : 0;

  return {
    score: stats.score + scoreGain,
    hrCount: stats.hrCount + (isHr ? 1 : 0),
    bestDistance: Math.max(stats.bestDistance, distance),
    perfectCount: stats.perfectCount + (outcome.swing.contact.perfectPerfect ? 1 : 0),
    strikeouts: stats.strikeouts + (outcome.swing.flight.result === 'strike' ? 1 : 0),
    streak: nextStreak,
    multiplier
  };
}

export function applyPitchOutcome(state: MatchState, outcome: OutcomeContext, tuning: ScoringTuning = DEFAULT_TUNING.scoring): MatchState {
  if (state.state.ended) return state;
  const nextStats = outcome.role === 'player' ? updateStats(state.stats, outcome, tuning) : state.stats;

  if (state.state.kind === 'classic_10') {
    const pitchesThrown = state.state.pitchesThrown + 1;
    return {
      ...state,
      stats: nextStats,
      state: {
        ...state.state,
        pitchesThrown,
        pitchesRemaining: Math.max(0, CLASSIC_PITCHES - pitchesThrown),
        ended: pitchesThrown >= CLASSIC_PITCHES
      }
    };
  }

  if (state.state.kind === 'timed_60') {
    return {
      ...state,
      stats: nextStats,
      state: {
        ...state.state
      }
    };
  }

  const duelState = state.state;
  const isPlayer = outcome.role === 'player';
  const playerPitchesThrown = duelState.playerPitchesThrown + (isPlayer ? 1 : 0);
  const aiPitchesThrown = duelState.aiPitchesThrown + (isPlayer ? 0 : 1);

  const playerScore = isPlayer ? nextStats.score : duelState.playerScore;
  const aiScore = !isPlayer
    ? duelState.aiScore + (outcome.swing.flight.isHomeRun ? Math.max(60, Math.floor(outcome.swing.flight.distanceFt * 0.72)) : 0)
    : duelState.aiScore;

  const nextPhase = playerPitchesThrown >= DUEL_PITCHES ? 'ai' : 'player';
  const ended = playerPitchesThrown >= DUEL_PITCHES && aiPitchesThrown >= DUEL_PITCHES;

  return {
    ...state,
    stats: nextStats,
    state: {
      ...duelState,
      playerPitchesThrown,
      aiPitchesThrown,
      playerScore,
      aiScore,
      phase: ended ? duelState.phase : nextPhase,
      ended
    }
  };
}

export function resolveMatchEnd(state: MatchState, durationMs: number): MatchEndSummary {
  let winner: 'player' | 'ai' | 'tie' | null = null;
  if (state.state.kind === 'duel_10') {
    if (state.state.playerScore > state.state.aiScore) winner = 'player';
    else if (state.state.playerScore < state.state.aiScore) winner = 'ai';
    else winner = 'tie';
  }

  return {
    mode: state.mode,
    score: state.stats.score,
    hrCount: state.stats.hrCount,
    bestDistance: state.stats.bestDistance,
    perfectCount: state.stats.perfectCount,
    durationMs,
    winner
  };
}
