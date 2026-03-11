import { createSeededRng, hashStringToSeed } from '../rng';

export type SpectacleStepType = 'strap-align' | 'clasp-lock' | 'seal-check';

export interface SpectacleFasteningConfig {
  durationMs: number;
  stepsMin: number;
  stepsMax: number;
  baseToleranceMs: number;
  retryPenaltyMs: number;
  oscillationMs: number;
}

export interface SpectacleStep {
  id: SpectacleStepType;
  targetPhase: number;
  toleranceMs: number;
}

export interface SpectacleFasteningState {
  elapsedMs: number;
  steps: SpectacleStep[];
  currentStep: number;
  mistakes: number;
  retryTimeMs: number;
  done: boolean;
  success: boolean;
}

export type SpectacleGrade = 'S' | 'A' | 'B' | 'C';

const STEP_TYPES: SpectacleStepType[] = ['strap-align', 'clasp-lock', 'seal-check'];

export const DEFAULT_SPECTACLE_FASTENING_CONFIG: SpectacleFasteningConfig = {
  durationMs: 11500,
  stepsMin: 3,
  stepsMax: 5,
  baseToleranceMs: 230,
  retryPenaltyMs: 520,
  oscillationMs: 900
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampPhase(phase: number): number {
  if (phase < 0) {
    const wrapped = 1 - (Math.abs(phase) % 1);
    return wrapped === 1 ? 0 : wrapped;
  }
  return phase % 1;
}

function phaseDistance(a: number, b: number): number {
  const direct = Math.abs(a - b);
  return Math.min(direct, 1 - direct);
}

function normalizedRoll(raw: number): number {
  if (raw < 0) return 1 + raw;
  if (raw >= 1) return raw % 1;
  return raw;
}

export function phaseAtTime(elapsedMs: number, config: SpectacleFasteningConfig = DEFAULT_SPECTACLE_FASTENING_CONFIG): number {
  const period = Math.max(300, config.oscillationMs);
  return clampPhase(elapsedMs / period);
}

export function generateSpectacleSteps(
  seed: number,
  difficultyMultiplier: number,
  config: SpectacleFasteningConfig = DEFAULT_SPECTACLE_FASTENING_CONFIG
): SpectacleStep[] {
  const mixedSeed =
    (seed ^ hashStringToSeed(`spectacle-fastening:${difficultyMultiplier.toFixed(3)}`) ^ hashStringToSeed('gate-admission')) >>> 0;
  const rng = createSeededRng(mixedSeed);
  const nextFloat = () => normalizedRoll(rng.next());
  const nextInt = (min: number, max: number) => {
    const lo = Math.ceil(Math.min(min, max));
    const hi = Math.floor(Math.max(min, max));
    const span = hi - lo + 1;
    return lo + Math.floor(nextFloat() * span);
  };
  const minSteps = Math.max(3, Math.round(config.stepsMin));
  const maxSteps = Math.max(minSteps, Math.min(5, Math.round(config.stepsMax)));
  const totalSteps = nextInt(minSteps, maxSteps);

  const toleranceScale = clamp(1.2 - (difficultyMultiplier - 1), 0.65, 1.35);
  const steps: SpectacleStep[] = [];

  for (let i = 0; i < totalSteps; i += 1) {
    const stepType = STEP_TYPES[(i + nextInt(0, STEP_TYPES.length - 1)) % STEP_TYPES.length] ?? 'seal-check';
    const targetPhase = nextFloat();
    const jitter = nextInt(-28, 28);
    const toleranceMs = Math.max(90, Math.round(config.baseToleranceMs * toleranceScale + jitter));
    steps.push({
      id: stepType,
      targetPhase,
      toleranceMs
    });
  }

  return steps;
}

export function createSpectacleFasteningState(
  seed: number,
  difficultyMultiplier: number,
  config: SpectacleFasteningConfig = DEFAULT_SPECTACLE_FASTENING_CONFIG
): SpectacleFasteningState {
  return {
    elapsedMs: 0,
    steps: generateSpectacleSteps(seed, difficultyMultiplier, config),
    currentStep: 0,
    mistakes: 0,
    retryTimeMs: 0,
    done: false,
    success: false
  };
}

export function stepSpectacleFastening(
  state: SpectacleFasteningState,
  attemptFasten: boolean,
  deltaMs: number,
  config: SpectacleFasteningConfig = DEFAULT_SPECTACLE_FASTENING_CONFIG
): SpectacleFasteningState {
  if (state.done) return state;

  let elapsedMs = state.elapsedMs + deltaMs;
  let currentStep = state.currentStep;
  let mistakes = state.mistakes;
  let retryTimeMs = state.retryTimeMs;

  if (attemptFasten && currentStep < state.steps.length) {
    const current = state.steps[currentStep];
    const phase = phaseAtTime(elapsedMs, config);
    const target = current?.targetPhase ?? 0.5;
    const tolerance = ((current?.toleranceMs ?? config.baseToleranceMs) / Math.max(300, config.oscillationMs));

    if (phaseDistance(phase, target) <= tolerance) {
      currentStep += 1;
    } else {
      mistakes += 1;
      retryTimeMs += config.retryPenaltyMs;
      elapsedMs += config.retryPenaltyMs;
    }
  }

  const success = currentStep >= state.steps.length;
  const timedOut = elapsedMs >= config.durationMs;

  return {
    ...state,
    elapsedMs,
    currentStep,
    mistakes,
    retryTimeMs,
    done: success || timedOut,
    success
  };
}

export function spectacleFasteningScore(
  state: SpectacleFasteningState,
  config: SpectacleFasteningConfig = DEFAULT_SPECTACLE_FASTENING_CONFIG
): number {
  const completion = state.success ? 420 : 40;
  const speed = Math.max(0, 1 - state.elapsedMs / Math.max(1, config.durationMs));
  const perfectStepBonus = state.success ? state.steps.length * 100 : state.currentStep * 80;
  const penalty = state.mistakes * 95 + Math.round(state.retryTimeMs * 0.2);
  return Math.max(0, Math.round(completion + speed * 320 + perfectStepBonus - penalty));
}

export function spectacleFasteningGrade(
  state: SpectacleFasteningState,
  config: SpectacleFasteningConfig = DEFAULT_SPECTACLE_FASTENING_CONFIG
): SpectacleGrade {
  if (!state.success) return 'C';
  const timeRatio = state.elapsedMs / Math.max(1, config.durationMs);
  if (state.mistakes === 0 && timeRatio <= 0.72) return 'S';
  if (state.mistakes <= 1 && timeRatio <= 0.9) return 'A';
  return 'B';
}

export function isSpectacleFasteningPerfect(
  state: SpectacleFasteningState,
  config: SpectacleFasteningConfig = DEFAULT_SPECTACLE_FASTENING_CONFIG
): boolean {
  return spectacleFasteningGrade(state, config) === 'S';
}
