export type ForestObstacle = 'root-high' | 'branch-low' | null;
export type ForestAction = 'jump' | 'duck' | 'none';

export interface ForestCrossingState {
  elapsedMs: number;
  distance: number;
  markers: number;
  hits: number;
  done: boolean;
}

export interface ForestCrossingConfig {
  durationMs: number;
  speedPerSecond: number;
  markerValue: number;
  hitPenalty: number;
}

export const DEFAULT_FOREST_CROSSING_CONFIG: ForestCrossingConfig = {
  durationMs: 9000,
  speedPerSecond: 190,
  markerValue: 90,
  hitPenalty: 110
};

export function createForestCrossingState(): ForestCrossingState {
  return {
    elapsedMs: 0,
    distance: 0,
    markers: 0,
    hits: 0,
    done: false
  };
}

function isHit(obstacle: ForestObstacle, action: ForestAction): boolean {
  if (obstacle === null) return false;
  if (obstacle === 'root-high') return action !== 'jump';
  return action !== 'duck';
}

export function stepForestCrossing(
  state: ForestCrossingState,
  action: ForestAction,
  obstacle: ForestObstacle,
  collectedMarker: boolean,
  deltaMs: number,
  config: ForestCrossingConfig = DEFAULT_FOREST_CROSSING_CONFIG
): ForestCrossingState {
  if (state.done) return state;

  const elapsed = state.elapsedMs + deltaMs;

  return {
    elapsedMs: elapsed,
    distance: state.distance + config.speedPerSecond * (deltaMs / 1000),
    markers: state.markers + (collectedMarker ? 1 : 0),
    hits: state.hits + (isHit(obstacle, action) ? 1 : 0),
    done: elapsed >= config.durationMs
  };
}

export function forestCrossingScore(
  state: ForestCrossingState,
  config: ForestCrossingConfig = DEFAULT_FOREST_CROSSING_CONFIG
): number {
  return Math.max(0, Math.round(state.distance + state.markers * config.markerValue - state.hits * config.hitPenalty));
}

export function isForestCrossingPerfect(state: ForestCrossingState): boolean {
  return state.done && state.hits === 0 && state.markers >= 3;
}
