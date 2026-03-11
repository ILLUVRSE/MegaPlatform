export interface CourageTrialState {
  elapsedMs: number;
  needle: number;
  steadyMs: number;
  spikes: number;
  done: boolean;
  success: boolean;
}

export interface CourageTrialConfig {
  durationMs: number;
  menaceDrift: number;
  holdStrength: number;
  maxSpikes: number;
  centerBand: number;
}

export const DEFAULT_COURAGE_TRIAL_CONFIG: CourageTrialConfig = {
  durationMs: 10500,
  menaceDrift: 0.72,
  holdStrength: 0.9,
  maxSpikes: 5,
  centerBand: 0.24
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createCourageTrialState(): CourageTrialState {
  return {
    elapsedMs: 0,
    needle: 0,
    steadyMs: 0,
    spikes: 0,
    done: false,
    success: false
  };
}

export function stepCourageTrial(
  state: CourageTrialState,
  holdInput: number,
  menaceImpulse: number,
  deltaMs: number,
  config: CourageTrialConfig = DEFAULT_COURAGE_TRIAL_CONFIG
): CourageTrialState {
  if (state.done) return state;

  const drift = menaceImpulse * config.menaceDrift * (deltaMs / 1000);
  const correction = holdInput * config.holdStrength * (deltaMs / 1000);
  const needle = clamp(state.needle + drift - correction, -1, 1);
  const elapsed = state.elapsedMs + deltaMs;

  const spiked = Math.abs(needle) >= 0.82;
  const spikes = state.spikes + (spiked ? 1 : 0);
  const steadyMs = state.steadyMs + (Math.abs(needle) <= config.centerBand ? deltaMs : 0);

  if (spikes >= config.maxSpikes) {
    return {
      elapsedMs: elapsed,
      needle,
      steadyMs,
      spikes,
      done: true,
      success: false
    };
  }

  if (elapsed >= config.durationMs) {
    return {
      elapsedMs: elapsed,
      needle,
      steadyMs,
      spikes,
      done: true,
      success: true
    };
  }

  return {
    elapsedMs: elapsed,
    needle,
    steadyMs,
    spikes,
    done: false,
    success: false
  };
}

export function courageTrialScore(state: CourageTrialState, config: CourageTrialConfig = DEFAULT_COURAGE_TRIAL_CONFIG): number {
  const steadyRatio = state.steadyMs / config.durationMs;
  const spikePenalty = state.spikes * 120;
  const completionBonus = state.success ? 260 : 0;
  return Math.max(0, Math.round(steadyRatio * 900 + completionBonus - spikePenalty));
}

export function isCourageTrialPerfect(state: CourageTrialState, config: CourageTrialConfig = DEFAULT_COURAGE_TRIAL_CONFIG): boolean {
  return state.success && state.spikes <= 1 && state.steadyMs >= config.durationMs * 0.72;
}
