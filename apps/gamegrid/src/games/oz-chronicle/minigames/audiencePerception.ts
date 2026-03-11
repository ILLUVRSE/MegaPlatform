import { createSeededRng, hashStringToSeed } from '../rng';

export interface AudiencePerceptionConfig {
  durationMs: number;
  audienceCount: number;
  dialSteps: number;
  tolerance: number;
  rotateStep: number;
}

export interface AudienceTargets {
  fear: number;
  hope: number;
  faith: number;
}

export interface AudiencePerceptionState {
  elapsedMs: number;
  currentAudience: number;
  fear: number;
  hope: number;
  faith: number;
  mistakes: number;
  targets: AudienceTargets[];
  done: boolean;
  success: boolean;
}

export type AudienceGrade = 'S' | 'A' | 'B' | 'C';

export const DEFAULT_AUDIENCE_PERCEPTION_CONFIG: AudiencePerceptionConfig = {
  durationMs: 12000,
  audienceCount: 4,
  dialSteps: 12,
  tolerance: 1,
  rotateStep: 1
};

function clampDial(value: number, steps: number): number {
  const mod = value % steps;
  return mod < 0 ? mod + steps : mod;
}

function distance(a: number, b: number, steps: number): number {
  const direct = Math.abs(a - b);
  return Math.min(direct, steps - direct);
}

function normalizeRoll(value: number): number {
  const wrapped = value % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

export function buildAudienceTargets(
  seed: number,
  difficultyMultiplier: number,
  config: AudiencePerceptionConfig = DEFAULT_AUDIENCE_PERCEPTION_CONFIG
): AudienceTargets[] {
  const rng = createSeededRng((seed ^ hashStringToSeed(`audience-perception:${difficultyMultiplier.toFixed(3)}`)) >>> 0);
  const targets: AudienceTargets[] = [];

  for (let i = 0; i < config.audienceCount; i += 1) {
    const fear = Math.floor(normalizeRoll(rng.next()) * config.dialSteps) % config.dialSteps;
    const hope = Math.floor(normalizeRoll(rng.next()) * config.dialSteps) % config.dialSteps;
    const faith = Math.floor(normalizeRoll(rng.next()) * config.dialSteps) % config.dialSteps;
    targets.push({ fear, hope, faith });
  }

  return targets;
}

export function createAudiencePerceptionState(
  seed: number,
  difficultyMultiplier: number,
  config: AudiencePerceptionConfig = DEFAULT_AUDIENCE_PERCEPTION_CONFIG
): AudiencePerceptionState {
  return {
    elapsedMs: 0,
    currentAudience: 0,
    fear: 0,
    hope: 0,
    faith: 0,
    mistakes: 0,
    targets: buildAudienceTargets(seed, difficultyMultiplier, config),
    done: false,
    success: false
  };
}

function aligned(state: AudiencePerceptionState, config: AudiencePerceptionConfig): boolean {
  const target = state.targets[state.currentAudience];
  if (!target) return false;
  return (
    distance(state.fear, target.fear, config.dialSteps) <= config.tolerance &&
    distance(state.hope, target.hope, config.dialSteps) <= config.tolerance &&
    distance(state.faith, target.faith, config.dialSteps) <= config.tolerance
  );
}

export function stepAudiencePerception(
  state: AudiencePerceptionState,
  action: 'none' | 'fear' | 'hope' | 'faith' | 'seal',
  deltaMs: number,
  config: AudiencePerceptionConfig = DEFAULT_AUDIENCE_PERCEPTION_CONFIG
): AudiencePerceptionState {
  if (state.done) return state;

  let fear = state.fear;
  let hope = state.hope;
  let faith = state.faith;
  let currentAudience = state.currentAudience;
  let mistakes = state.mistakes;
  const elapsedMs = state.elapsedMs + deltaMs;

  if (action === 'fear') fear = clampDial(fear + config.rotateStep, config.dialSteps);
  if (action === 'hope') hope = clampDial(hope + config.rotateStep, config.dialSteps);
  if (action === 'faith') faith = clampDial(faith + config.rotateStep, config.dialSteps);

  const trialState: AudiencePerceptionState = {
    ...state,
    elapsedMs,
    currentAudience,
    fear,
    hope,
    faith,
    mistakes
  };

  if (action === 'seal') {
    if (aligned(trialState, config)) {
      currentAudience += 1;
    } else {
      mistakes += 1;
    }
  }

  const success = currentAudience >= state.targets.length;
  const timedOut = elapsedMs >= config.durationMs;

  return {
    ...state,
    elapsedMs,
    currentAudience,
    fear,
    hope,
    faith,
    mistakes,
    done: success || timedOut,
    success
  };
}

export function audiencePerceptionScore(
  state: AudiencePerceptionState,
  config: AudiencePerceptionConfig = DEFAULT_AUDIENCE_PERCEPTION_CONFIG
): number {
  const completion = state.success ? 500 : 60;
  const progressScore = state.currentAudience * 140;
  const speedScore = Math.max(0, Math.round((1 - state.elapsedMs / config.durationMs) * 300));
  const mistakePenalty = state.mistakes * 90;
  return Math.max(0, completion + progressScore + speedScore - mistakePenalty);
}

export function audiencePerceptionGrade(
  state: AudiencePerceptionState,
  config: AudiencePerceptionConfig = DEFAULT_AUDIENCE_PERCEPTION_CONFIG
): AudienceGrade {
  if (!state.success) return 'C';
  const timeRatio = state.elapsedMs / config.durationMs;
  if (state.mistakes === 0 && timeRatio <= 0.7) return 'S';
  if (state.mistakes <= 2 && timeRatio <= 0.9) return 'A';
  return 'B';
}

export function isAudiencePerceptionPerfect(
  state: AudiencePerceptionState,
  config: AudiencePerceptionConfig = DEFAULT_AUDIENCE_PERCEPTION_CONFIG
): boolean {
  return audiencePerceptionGrade(state, config) === 'S';
}
