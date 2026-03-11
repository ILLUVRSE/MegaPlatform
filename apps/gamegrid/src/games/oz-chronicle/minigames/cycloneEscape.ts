export interface CycloneState {
  elapsedMs: number;
  stability: number;
  survivedMs: number;
  done: boolean;
  success: boolean;
}

export interface CycloneConfig {
  durationMs: number;
  driftPerSecond: number;
  correctionStrength: number;
  safeBand: number;
}

export const DEFAULT_CYCLONE_CONFIG: CycloneConfig = {
  durationMs: 13000,
  driftPerSecond: 0.42,
  correctionStrength: 0.9,
  safeBand: 0.4
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createCycloneState(): CycloneState {
  return {
    elapsedMs: 0,
    stability: 0,
    survivedMs: 0,
    done: false,
    success: false
  };
}

export function stepCyclone(
  state: CycloneState,
  inputTilt: number,
  windImpulse: number,
  deltaMs: number,
  config: CycloneConfig = DEFAULT_CYCLONE_CONFIG
): CycloneState {
  if (state.done) return state;

  const drift = windImpulse * config.driftPerSecond * (deltaMs / 1000);
  const correction = inputTilt * config.correctionStrength * (deltaMs / 1000);
  const nextStability = clamp(state.stability + drift - correction, -1, 1);
  const elapsed = state.elapsedMs + deltaMs;
  const insideSafeBand = Math.abs(nextStability) <= config.safeBand;

  const next: CycloneState = {
    elapsedMs: elapsed,
    stability: nextStability,
    survivedMs: state.survivedMs + (insideSafeBand ? deltaMs : 0),
    done: false,
    success: false
  };

  if (Math.abs(nextStability) >= 0.98) {
    return {
      ...next,
      done: true,
      success: false
    };
  }

  if (elapsed >= config.durationMs) {
    return {
      ...next,
      done: true,
      success: true
    };
  }

  return next;
}

export function cycloneScore(state: CycloneState, config: CycloneConfig = DEFAULT_CYCLONE_CONFIG): number {
  const survivalRatio = state.survivedMs / config.durationMs;
  const controlBonus = 1 - Math.abs(state.stability);
  const completedBonus = state.success ? 0.25 : 0;
  return Math.max(0, Math.round((survivalRatio * 0.7 + controlBonus * 0.3 + completedBonus) * 1000));
}
