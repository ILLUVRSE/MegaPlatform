import type { PixelPuckMatchConfig, PixelPuckMatchState } from './types';

export const DEFAULT_TARGET_SCORE = 7;
export const DEFAULT_TIMED_MS = 90_000;

export function createInitialMatchState(mode: PixelPuckMatchConfig['mode']): PixelPuckMatchState {
  return {
    config: {
      mode,
      targetScore: DEFAULT_TARGET_SCORE,
      timedDurationMs: DEFAULT_TIMED_MS
    },
    scores: { player: 0, ai: 0 },
    elapsedMs: 0,
    ended: false,
    winner: 'none',
    suddenDeath: false
  };
}

export function tickMatchTimer(state: PixelPuckMatchState, deltaMs: number): PixelPuckMatchState {
  if (state.ended || state.config.mode !== 'timed') return state;

  const elapsedMs = Math.min(state.config.timedDurationMs, state.elapsedMs + deltaMs);
  const timedOut = elapsedMs >= state.config.timedDurationMs;

  if (!timedOut) {
    return { ...state, elapsedMs };
  }

  if (state.scores.player !== state.scores.ai) {
    return {
      ...state,
      elapsedMs,
      ended: true,
      winner: state.scores.player > state.scores.ai ? 'player' : 'ai'
    };
  }

  return {
    ...state,
    elapsedMs,
    suddenDeath: true
  };
}

export function applyGoal(state: PixelPuckMatchState, scorer: 'player' | 'ai'): PixelPuckMatchState {
  if (state.ended) return state;
  if (state.config.mode === 'practice') return state;

  const nextScores = {
    player: state.scores.player + (scorer === 'player' ? 1 : 0),
    ai: state.scores.ai + (scorer === 'ai' ? 1 : 0)
  };

  if (state.config.mode === 'first_to_7') {
    const playerWon = nextScores.player >= state.config.targetScore;
    const aiWon = nextScores.ai >= state.config.targetScore;
    return {
      ...state,
      scores: nextScores,
      ended: playerWon || aiWon,
      winner: playerWon ? 'player' : aiWon ? 'ai' : 'none'
    };
  }

  if (state.config.mode === 'timed' && state.suddenDeath) {
    return {
      ...state,
      scores: nextScores,
      ended: true,
      winner: scorer
    };
  }

  return {
    ...state,
    scores: nextScores
  };
}

export function formatTimer(state: PixelPuckMatchState): string {
  if (state.config.mode !== 'timed') return '--:--';
  if (state.suddenDeath) return 'OT';
  const remainingMs = Math.max(0, state.config.timedDurationMs - state.elapsedMs);
  const seconds = Math.ceil(remainingMs / 1000);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
