import type { MatchState, TeamSide } from './types';

function winnerFromScore(score: readonly [number, number]): TeamSide | 'draw' {
  if (score[0] === score[1]) return 'draw';
  return score[0] > score[1] ? 'player' : 'ai';
}

export function createMatchState(mode: 'first_to_5' | 'timed', timedSeconds: number): MatchState {
  return {
    mode,
    targetScore: 5,
    timedSeconds,
    score: [0, 0],
    remainingMs: mode === 'timed' ? timedSeconds * 1000 : 0,
    suddenDeath: false,
    ended: false,
    winner: null
  };
}

export function registerGoal(state: MatchState, scorer: TeamSide): MatchState {
  if (state.ended) return state;

  const score: [number, number] = [state.score[0], state.score[1]];
  score[scorer === 'player' ? 0 : 1] += 1;

  if (state.mode === 'first_to_5') {
    if (score[0] >= state.targetScore || score[1] >= state.targetScore) {
      return {
        ...state,
        score,
        ended: true,
        winner: winnerFromScore(score)
      };
    }
    return {
      ...state,
      score
    };
  }

  if (state.suddenDeath) {
    return {
      ...state,
      score,
      ended: true,
      winner: winnerFromScore(score)
    };
  }

  return {
    ...state,
    score
  };
}

export function tickMatchClock(state: MatchState, deltaMs: number): MatchState {
  if (state.mode !== 'timed' || state.ended || state.suddenDeath) return state;

  const remainingMs = Math.max(0, state.remainingMs - deltaMs);
  if (remainingMs > 0) {
    return {
      ...state,
      remainingMs
    };
  }

  if (state.score[0] === state.score[1]) {
    return {
      ...state,
      remainingMs: 0,
      suddenDeath: true
    };
  }

  return {
    ...state,
    remainingMs: 0,
    ended: true,
    winner: winnerFromScore(state.score)
  };
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const mm = minutes < 10 ? `0${minutes}` : String(minutes);
  const ss = seconds < 10 ? `0${seconds}` : String(seconds);
  return `${mm}:${ss}`;
}
