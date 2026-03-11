export interface CornfieldRescueState {
  elapsedMs: number;
  progress: number;
  crowsStrikes: number;
  done: boolean;
  success: boolean;
}

export interface CornfieldRescueConfig {
  requiredProgress: number;
  maxStrikes: number;
  durationMs: number;
}

export const DEFAULT_CORNFIELD_CONFIG: CornfieldRescueConfig = {
  requiredProgress: 4,
  maxStrikes: 3,
  durationMs: 12000
};

export function createCornfieldRescueState(): CornfieldRescueState {
  return {
    elapsedMs: 0,
    progress: 0,
    crowsStrikes: 0,
    done: false,
    success: false
  };
}

export type CornfieldInput = 'untie' | 'crow-hit' | 'wait';

export function stepCornfieldRescue(
  state: CornfieldRescueState,
  input: CornfieldInput,
  deltaMs: number,
  config: CornfieldRescueConfig = DEFAULT_CORNFIELD_CONFIG
): CornfieldRescueState {
  if (state.done) return state;

  let progress = state.progress;
  let strikes = state.crowsStrikes;

  if (input === 'untie') progress += 1;
  if (input === 'crow-hit') strikes += 1;

  const elapsed = state.elapsedMs + deltaMs;

  if (progress >= config.requiredProgress) {
    return {
      elapsedMs: elapsed,
      progress,
      crowsStrikes: strikes,
      done: true,
      success: true
    };
  }

  if (strikes >= config.maxStrikes || elapsed >= config.durationMs) {
    return {
      elapsedMs: elapsed,
      progress,
      crowsStrikes: strikes,
      done: true,
      success: false
    };
  }

  return {
    elapsedMs: elapsed,
    progress,
    crowsStrikes: strikes,
    done: false,
    success: false
  };
}

export function cornfieldScore(
  state: CornfieldRescueState,
  config: CornfieldRescueConfig = DEFAULT_CORNFIELD_CONFIG
): number {
  const progressRatio = state.progress / config.requiredProgress;
  const strikePenalty = state.crowsStrikes * 140;
  const successBonus = state.success ? 300 : 0;
  return Math.max(0, Math.round(progressRatio * 700 + successBonus - strikePenalty));
}
