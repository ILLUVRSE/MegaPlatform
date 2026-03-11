import type { HoleProgress, MinigolfMode, MinigolfSessionState, MinigolfSessionSummary } from './types';

export const TIME_ATTACK_STROKE_PENALTY_MS = 2000;

interface SessionConfig {
  mode: MinigolfMode;
  holeOrder: string[];
  practice: boolean;
}

function cloneProgress(entry: HoleProgress): HoleProgress {
  return {
    holeId: entry.holeId,
    par: entry.par,
    strokes: entry.strokes,
    timeMs: entry.timeMs
  };
}

export function createInitialSession(config: SessionConfig): MinigolfSessionState {
  return {
    mode: config.mode,
    practice: config.practice,
    holeOrder: config.holeOrder.slice(),
    currentHoleIndex: 0,
    currentHoleStrokes: 0,
    currentHoleTimeMs: 0,
    timePenaltyMs: 0,
    elapsedMs: 0,
    completedHoles: [],
    finished: config.holeOrder.length === 0
  };
}

export function tickSessionTime(state: MinigolfSessionState, dtMs: number): MinigolfSessionState {
  if (state.finished) return state;
  return {
    ...state,
    elapsedMs: state.elapsedMs + dtMs,
    currentHoleTimeMs: state.currentHoleTimeMs + dtMs
  };
}

export function registerStroke(state: MinigolfSessionState): MinigolfSessionState {
  if (state.finished) return state;
  return {
    ...state,
    currentHoleStrokes: state.currentHoleStrokes + 1,
    timePenaltyMs: state.timePenaltyMs + (state.mode === 'time_attack' ? TIME_ATTACK_STROKE_PENALTY_MS : 0)
  };
}

export function applyWaterPenalty(state: MinigolfSessionState): MinigolfSessionState {
  if (state.finished) return state;
  return {
    ...state,
    currentHoleStrokes: state.currentHoleStrokes + 1,
    timePenaltyMs: state.timePenaltyMs + (state.mode === 'time_attack' ? TIME_ATTACK_STROKE_PENALTY_MS : 0)
  };
}

export function completeCurrentHole(
  state: MinigolfSessionState,
  holeId: string,
  par: number
): MinigolfSessionState {
  if (state.finished) return state;

  const progress: HoleProgress = {
    holeId,
    par,
    strokes: state.currentHoleStrokes,
    timeMs: state.currentHoleTimeMs
  };

  const completed = state.completedHoles.map(cloneProgress);
  completed.push(progress);

  const nextIndex = state.currentHoleIndex + 1;
  const finished = nextIndex >= state.holeOrder.length;

  return {
    ...state,
    currentHoleIndex: nextIndex,
    currentHoleStrokes: 0,
    currentHoleTimeMs: 0,
    completedHoles: completed,
    finished
  };
}

export function retryCurrentHole(state: MinigolfSessionState): MinigolfSessionState {
  if (state.finished) return state;
  return {
    ...state,
    currentHoleStrokes: 0,
    currentHoleTimeMs: 0
  };
}

export function getCurrentHoleId(state: MinigolfSessionState): string | null {
  if (state.currentHoleIndex < 0 || state.currentHoleIndex >= state.holeOrder.length) return null;
  return state.holeOrder[state.currentHoleIndex];
}

export function buildSessionSummary(state: MinigolfSessionState): MinigolfSessionSummary {
  const holes = state.completedHoles;
  let totalStrokes = 0;
  let totalPar = 0;
  let bestHole: { id: string; delta: number } | null = null;
  let worstHole: { id: string; delta: number } | null = null;

  for (let i = 0; i < holes.length; i += 1) {
    const hole = holes[i];
    totalStrokes += hole.strokes;
    totalPar += hole.par;

    const delta = hole.strokes - hole.par;
    if (!bestHole || delta < bestHole.delta) {
      bestHole = { id: hole.holeId, delta };
    }
    if (!worstHole || delta > worstHole.delta) {
      worstHole = { id: hole.holeId, delta };
    }
  }

  return {
    totalStrokes,
    totalPar,
    parDelta: totalStrokes - totalPar,
    bestHole,
    worstHole,
    totalTimeMs: state.elapsedMs + state.timePenaltyMs,
    holesPlayed: holes.length
  };
}
