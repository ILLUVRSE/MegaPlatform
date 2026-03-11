export interface OilAndJointsState {
  elapsedMs: number;
  pressure: number;
  nextValve: number;
  corrects: number;
  misses: number;
  done: boolean;
  success: boolean;
}

export interface OilAndJointsConfig {
  durationMs: number;
  valveCount: number;
  targetCorrects: number;
  drainPerSecond: number;
  refillOnCorrect: number;
  penaltyOnMiss: number;
}

export const DEFAULT_OIL_AND_JOINTS_CONFIG: OilAndJointsConfig = {
  durationMs: 11000,
  valveCount: 4,
  targetCorrects: 9,
  drainPerSecond: 10,
  refillOnCorrect: 16,
  penaltyOnMiss: 12
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createOilAndJointsState(): OilAndJointsState {
  return {
    elapsedMs: 0,
    pressure: 72,
    nextValve: 0,
    corrects: 0,
    misses: 0,
    done: false,
    success: false
  };
}

export function stepOilAndJoints(
  state: OilAndJointsState,
  tappedValve: number | null,
  deltaMs: number,
  config: OilAndJointsConfig = DEFAULT_OIL_AND_JOINTS_CONFIG
): OilAndJointsState {
  if (state.done) return state;

  let pressure = clamp(state.pressure - config.drainPerSecond * (deltaMs / 1000), 0, 100);
  let nextValve = state.nextValve;
  let corrects = state.corrects;
  let misses = state.misses;

  if (tappedValve !== null) {
    const expected = nextValve % config.valveCount;
    if (tappedValve === expected) {
      nextValve += 1;
      corrects += 1;
      pressure = clamp(pressure + config.refillOnCorrect, 0, 100);
    } else {
      misses += 1;
      pressure = clamp(pressure - config.penaltyOnMiss, 0, 100);
    }
  }

  const elapsed = state.elapsedMs + deltaMs;

  if (corrects >= config.targetCorrects) {
    return {
      elapsedMs: elapsed,
      pressure,
      nextValve,
      corrects,
      misses,
      done: true,
      success: true
    };
  }

  if (pressure <= 0 || elapsed >= config.durationMs) {
    return {
      elapsedMs: elapsed,
      pressure,
      nextValve,
      corrects,
      misses,
      done: true,
      success: false
    };
  }

  return {
    elapsedMs: elapsed,
    pressure,
    nextValve,
    corrects,
    misses,
    done: false,
    success: false
  };
}

export function oilAndJointsScore(state: OilAndJointsState): number {
  const score = state.corrects * 125 - state.misses * 85 + Math.round(state.pressure * 3) + (state.success ? 250 : 0);
  return Math.max(0, score);
}

export function isOilAndJointsPerfect(state: OilAndJointsState): boolean {
  return state.success && state.misses === 0 && state.pressure >= 34;
}
