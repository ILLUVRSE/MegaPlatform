import { createSeededRng, hashStringToSeed } from '../rng';

export type BalloonRigStepType = 'rope-knot' | 'basket-latch' | 'wind-vane' | 'burner-check';

export interface BalloonRiggingConfig {
  durationMs: number;
  stepsMin: number;
  stepsMax: number;
  baseToleranceMs: number;
  retryPenaltyMs: number;
  oscillationMs: number;
}

export interface BalloonRigStep {
  id: BalloonRigStepType;
  targetPhase: number;
  toleranceMs: number;
}

export interface BalloonRiggingState {
  elapsedMs: number;
  steps: BalloonRigStep[];
  currentStep: number;
  mistakes: number;
  retryTimeMs: number;
  done: boolean;
  success: boolean;
}

const STEP_TYPES: BalloonRigStepType[] = ['rope-knot', 'basket-latch', 'wind-vane', 'burner-check'];

export const DEFAULT_BALLOON_RIGGING_CONFIG: BalloonRiggingConfig = {
  durationMs: 11200,
  stepsMin: 4,
  stepsMax: 6,
  baseToleranceMs: 220,
  retryPenaltyMs: 500,
  oscillationMs: 860
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function wrapPhase(value: number): number {
  if (value < 0) {
    const wrapped = 1 - (Math.abs(value) % 1);
    return wrapped === 1 ? 0 : wrapped;
  }
  return value % 1;
}

function phaseDistance(a: number, b: number): number {
  const direct = Math.abs(a - b);
  return Math.min(direct, 1 - direct);
}

function nextNormalized(raw: number): number {
  if (raw < 0) return 1 + raw;
  if (raw >= 1) return raw % 1;
  return raw;
}

export function balloonPhaseAtTime(elapsedMs: number, config: BalloonRiggingConfig = DEFAULT_BALLOON_RIGGING_CONFIG): number {
  const period = Math.max(280, config.oscillationMs);
  return wrapPhase(elapsedMs / period);
}

export function generateBalloonRigSteps(
  seed: number,
  difficultyMultiplier: number,
  nodeId: string,
  config: BalloonRiggingConfig = DEFAULT_BALLOON_RIGGING_CONFIG
): BalloonRigStep[] {
  const mixedSeed = (seed ^ hashStringToSeed(`balloon-rigging:${nodeId}:${difficultyMultiplier.toFixed(3)}`)) >>> 0;
  const rng = createSeededRng(mixedSeed);
  const nextFloat = () => nextNormalized(rng.next());
  const nextInt = (min: number, max: number) => {
    const lo = Math.ceil(Math.min(min, max));
    const hi = Math.floor(Math.max(min, max));
    const span = hi - lo + 1;
    return lo + Math.floor(nextFloat() * span);
  };

  const minSteps = Math.max(4, Math.round(config.stepsMin));
  const maxSteps = Math.max(minSteps, Math.min(6, Math.round(config.stepsMax)));
  const totalSteps = nextInt(minSteps, maxSteps);
  const toleranceScale = clamp(1.18 - (difficultyMultiplier - 1), 0.64, 1.34);

  const steps: BalloonRigStep[] = [];
  for (let i = 0; i < totalSteps; i += 1) {
    const stepType = STEP_TYPES[(i + nextInt(0, STEP_TYPES.length - 1)) % STEP_TYPES.length] ?? 'rope-knot';
    const targetPhase = nextFloat();
    const jitter = nextInt(-24, 24);
    const toleranceMs = Math.max(88, Math.round(config.baseToleranceMs * toleranceScale + jitter));
    steps.push({
      id: stepType,
      targetPhase,
      toleranceMs
    });
  }

  return steps;
}

export function createBalloonRiggingState(
  seed: number,
  difficultyMultiplier: number,
  nodeId: string,
  config: BalloonRiggingConfig = DEFAULT_BALLOON_RIGGING_CONFIG
): BalloonRiggingState {
  return {
    elapsedMs: 0,
    steps: generateBalloonRigSteps(seed, difficultyMultiplier, nodeId, config),
    currentStep: 0,
    mistakes: 0,
    retryTimeMs: 0,
    done: false,
    success: false
  };
}

export function stepBalloonRigging(
  state: BalloonRiggingState,
  attemptStep: boolean,
  deltaMs: number,
  config: BalloonRiggingConfig = DEFAULT_BALLOON_RIGGING_CONFIG
): BalloonRiggingState {
  if (state.done) return state;

  let elapsedMs = state.elapsedMs + deltaMs;
  let currentStep = state.currentStep;
  let mistakes = state.mistakes;
  let retryTimeMs = state.retryTimeMs;

  if (attemptStep && currentStep < state.steps.length) {
    const current = state.steps[currentStep];
    const phase = balloonPhaseAtTime(elapsedMs, config);
    const target = current?.targetPhase ?? 0.5;
    const tolerance = ((current?.toleranceMs ?? config.baseToleranceMs) / Math.max(280, config.oscillationMs));

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

export function balloonRiggingScore(
  state: BalloonRiggingState,
  config: BalloonRiggingConfig = DEFAULT_BALLOON_RIGGING_CONFIG
): number {
  const completion = state.success ? 460 : 60;
  const speed = Math.max(0, 1 - state.elapsedMs / Math.max(1, config.durationMs));
  const stepScore = state.success ? state.steps.length * 96 : state.currentStep * 74;
  const penalty = state.mistakes * 90 + Math.round(state.retryTimeMs * 0.2);
  return Math.max(0, Math.round(completion + speed * 320 + stepScore - penalty));
}

export function isBalloonRiggingPerfect(
  state: BalloonRiggingState,
  config: BalloonRiggingConfig = DEFAULT_BALLOON_RIGGING_CONFIG
): boolean {
  if (!state.success) return false;
  const ratio = state.elapsedMs / Math.max(1, config.durationMs);
  return state.mistakes === 0 && ratio <= 0.78;
}
