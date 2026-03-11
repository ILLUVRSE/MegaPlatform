export interface SilverSlippersDashState {
  elapsedMs: number;
  distance: number;
  markers: number;
  falls: number;
  done: boolean;
}

export interface SilverSlippersDashConfig {
  durationMs: number;
  markerValue: number;
  fallPenalty: number;
}

export const DEFAULT_SILVER_DASH_CONFIG: SilverSlippersDashConfig = {
  durationMs: 9000,
  markerValue: 120,
  fallPenalty: 90
};

export function createSilverSlippersDashState(): SilverSlippersDashState {
  return {
    elapsedMs: 0,
    distance: 0,
    markers: 0,
    falls: 0,
    done: false
  };
}

export function stepSilverSlippersDash(
  state: SilverSlippersDashState,
  deltaMs: number,
  collectedMarker: boolean,
  tripped: boolean,
  config: SilverSlippersDashConfig = DEFAULT_SILVER_DASH_CONFIG
): SilverSlippersDashState {
  if (state.done) return state;

  const elapsed = state.elapsedMs + deltaMs;
  const done = elapsed >= config.durationMs;

  return {
    elapsedMs: elapsed,
    distance: state.distance + deltaMs * 0.25,
    markers: state.markers + (collectedMarker ? 1 : 0),
    falls: state.falls + (tripped ? 1 : 0),
    done
  };
}

export function silverSlippersDashScore(
  state: SilverSlippersDashState,
  config: SilverSlippersDashConfig = DEFAULT_SILVER_DASH_CONFIG
): number {
  return Math.max(0, Math.round(state.distance + state.markers * config.markerValue - state.falls * config.fallPenalty));
}
