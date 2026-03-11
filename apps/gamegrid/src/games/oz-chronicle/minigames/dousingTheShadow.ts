import { createSeededRng, hashStringToSeed } from '../rng';

export interface DousingTheShadowConfig {
  durationMs: number;
  laneCount: number;
  patternLength: number;
  requiredDouses: number;
  baseFearPerSecond: number;
  swellFearPerEvent: number;
  safeFearRecoveryPerEvent: number;
  calmCourageGainPerEvent: number;
  douseCourageGain: number;
  peakWindowMs: number;
  peakEveryEvents: number;
  scarecrowWindowBonusMs: number;
  tinWardMs: number;
  tinFearReduction: number;
  lionSteadyMs: number;
  clearSwellMs: number;
  successFearThreshold: number;
  swellChance: number;
  safeChance: number;
}

export interface DousingAssist {
  scarecrowWindow: boolean;
  tinWard: boolean;
  lionSteady: boolean;
  goldenCapReady: boolean;
}

export interface DousingInput {
  laneShift: -1 | 0 | 1;
  readyWater: boolean;
  useScarecrowWindow: boolean;
  useTinWard: boolean;
  useLionSteady: boolean;
  useCommand: boolean;
}

export interface DousingState {
  elapsedMs: number;
  lane: number;
  fearMeter: number;
  courageMeter: number;
  dousesHit: number;
  douseMisses: number;
  nextPatternIndex: number;
  done: boolean;
  success: boolean;
  swellMasks: Uint8Array;
  safeMasks: Uint8Array;
  peakWindows: Uint16Array;
  scarecrowWindowUsed: boolean;
  tinWardUsed: boolean;
  lionSteadyUsed: boolean;
  tinWardRemainingMs: number;
  lionSteadyRemainingMs: number;
  clearSwellRemainingMs: number;
  commandTriggers: number;
  spentCommandThisStep: boolean;
}

export const DEFAULT_DOUSING_THE_SHADOW_CONFIG: DousingTheShadowConfig = {
  durationMs: 12000,
  laneCount: 3,
  patternLength: 30,
  requiredDouses: 3,
  baseFearPerSecond: 0.022,
  swellFearPerEvent: 0.11,
  safeFearRecoveryPerEvent: 0.04,
  calmCourageGainPerEvent: 0.05,
  douseCourageGain: 0.16,
  peakWindowMs: 280,
  peakEveryEvents: 8,
  scarecrowWindowBonusMs: 120,
  tinWardMs: 2000,
  tinFearReduction: 0.28,
  lionSteadyMs: 1000,
  clearSwellMs: 1800,
  successFearThreshold: 0.86,
  swellChance: 0.46,
  safeChance: 0.37
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampLane(lane: number, laneCount: number): number {
  return clamp(Math.round(lane), 0, laneCount - 1);
}

function eventHit(mask: number, lane: number): boolean {
  return ((mask >> lane) & 1) === 1;
}

export function buildDousingPattern(
  seed: number,
  difficultyMultiplier: number,
  nodeId: string,
  config: DousingTheShadowConfig = DEFAULT_DOUSING_THE_SHADOW_CONFIG
): {
  swellMasks: Uint8Array;
  safeMasks: Uint8Array;
  peakWindows: Uint16Array;
} {
  const rng = createSeededRng((seed ^ hashStringToSeed(`dousing-shadow:${nodeId}:${difficultyMultiplier.toFixed(3)}`)) >>> 0);
  const swellMasks = new Uint8Array(config.patternLength);
  const safeMasks = new Uint8Array(config.patternLength);
  const peakWindows = new Uint16Array(config.requiredDouses);

  const tunedSwellChance = clamp(config.swellChance * difficultyMultiplier, 0.2, 0.88);
  const tunedSafeChance = clamp(config.safeChance / difficultyMultiplier, 0.16, 0.66);

  for (let i = 0; i < config.patternLength; i += 1) {
    let swellMask = 0;
    let safeMask = 0;
    for (let lane = 0; lane < config.laneCount; lane += 1) {
      if (rng.next() < tunedSwellChance) swellMask |= 1 << lane;
      if (rng.next() < tunedSafeChance) safeMask |= 1 << lane;
    }
    const calmLane = rng.nextInt(0, config.laneCount - 1);
    swellMask &= ~(1 << calmLane);
    safeMask |= 1 << calmLane;
    swellMasks[i] = swellMask;
    safeMasks[i] = safeMask;
  }

  const eventMs = config.durationMs / config.patternLength;
  for (let i = 0; i < config.requiredDouses; i += 1) {
    const eventIndex = Math.min(config.patternLength - 2, (i + 1) * config.peakEveryEvents - 1);
    const center = Math.round((eventIndex + 1) * eventMs);
    const jitter = Math.round((rng.next() - 0.5) * 120);
    peakWindows[i] = Math.max(200, center + jitter);
  }

  return { swellMasks, safeMasks, peakWindows };
}

export function createDousingState(
  seed: number,
  difficultyMultiplier: number,
  nodeId: string,
  config: DousingTheShadowConfig = DEFAULT_DOUSING_THE_SHADOW_CONFIG
): DousingState {
  const pattern = buildDousingPattern(seed, difficultyMultiplier, nodeId, config);
  return {
    elapsedMs: 0,
    lane: 1,
    fearMeter: 0,
    courageMeter: 0,
    dousesHit: 0,
    douseMisses: 0,
    nextPatternIndex: 0,
    done: false,
    success: false,
    swellMasks: pattern.swellMasks,
    safeMasks: pattern.safeMasks,
    peakWindows: pattern.peakWindows,
    scarecrowWindowUsed: false,
    tinWardUsed: false,
    lionSteadyUsed: false,
    tinWardRemainingMs: 0,
    lionSteadyRemainingMs: 0,
    clearSwellRemainingMs: 0,
    commandTriggers: 0,
    spentCommandThisStep: false
  };
}

function currentWindowMs(state: DousingState, assist: DousingAssist, config: DousingTheShadowConfig): number {
  if (assist.scarecrowWindow && state.scarecrowWindowUsed) {
    return config.peakWindowMs + config.scarecrowWindowBonusMs;
  }
  return config.peakWindowMs;
}

function nearPeak(state: DousingState, assist: DousingAssist, config: DousingTheShadowConfig): boolean {
  const peakIdx = Math.min(state.dousesHit, state.peakWindows.length - 1);
  const center = state.peakWindows[peakIdx] ?? 0;
  const window = currentWindowMs(state, assist, config);
  return Math.abs(state.elapsedMs - center) <= window;
}

export function stepDousingTheShadow(
  state: DousingState,
  input: DousingInput,
  deltaMs: number,
  assist: DousingAssist,
  config: DousingTheShadowConfig = DEFAULT_DOUSING_THE_SHADOW_CONFIG
): DousingState {
  if (state.done) return state;

  const elapsedMs = state.elapsedMs + deltaMs;
  let lane = clampLane(state.lane + input.laneShift, config.laneCount);
  let fearMeter = clamp(state.fearMeter + config.baseFearPerSecond * (deltaMs / 1000), 0, 1);
  let courageMeter = clamp(state.courageMeter, 0, 1);
  let dousesHit = state.dousesHit;
  let douseMisses = state.douseMisses;
  let nextPatternIndex = state.nextPatternIndex;
  let scarecrowWindowUsed = state.scarecrowWindowUsed;
  let tinWardUsed = state.tinWardUsed;
  let lionSteadyUsed = state.lionSteadyUsed;
  let tinWardRemainingMs = Math.max(0, state.tinWardRemainingMs - deltaMs);
  let lionSteadyRemainingMs = Math.max(0, state.lionSteadyRemainingMs - deltaMs);
  let clearSwellRemainingMs = Math.max(0, state.clearSwellRemainingMs - deltaMs);
  let commandTriggers = state.commandTriggers;
  let spentCommandThisStep = false;

  if (assist.scarecrowWindow && input.useScarecrowWindow && !scarecrowWindowUsed) {
    scarecrowWindowUsed = true;
  }

  if (assist.tinWard && input.useTinWard && !tinWardUsed) {
    tinWardUsed = true;
    tinWardRemainingMs = config.tinWardMs;
  }

  if (assist.lionSteady && input.useLionSteady && !lionSteadyUsed) {
    lionSteadyUsed = true;
    lionSteadyRemainingMs = config.lionSteadyMs;
  }

  if (assist.goldenCapReady && input.useCommand) {
    clearSwellRemainingMs = config.clearSwellMs;
    commandTriggers += 1;
    spentCommandThisStep = true;
  }

  const eventMs = config.durationMs / config.patternLength;
  while (nextPatternIndex < config.patternLength && elapsedMs >= (nextPatternIndex + 1) * eventMs) {
    const inSwell = eventHit(state.swellMasks[nextPatternIndex] ?? 0, lane);
    const inSafe = eventHit(state.safeMasks[nextPatternIndex] ?? 0, lane);

    if (inSwell && clearSwellRemainingMs <= 0) {
      let gain = config.swellFearPerEvent;
      if (tinWardRemainingMs > 0) gain *= 1 - config.tinFearReduction;
      if (lionSteadyRemainingMs > 0) gain *= 0.5;
      fearMeter += gain;
    } else if (inSafe) {
      fearMeter -= config.safeFearRecoveryPerEvent;
      courageMeter += config.calmCourageGainPerEvent;
    }

    nextPatternIndex += 1;
  }

  if (input.readyWater) {
    if (nearPeak({ ...state, elapsedMs, dousesHit, scarecrowWindowUsed }, assist, config)) {
      dousesHit += 1;
      courageMeter += config.douseCourageGain;
      fearMeter -= 0.08;
    } else {
      douseMisses += 1;
      fearMeter += 0.05;
    }
  }

  fearMeter = clamp(fearMeter, 0, 1);
  courageMeter = clamp(courageMeter, 0, 1);

  const failed = fearMeter >= 1;
  const timedOut = elapsedMs >= config.durationMs;
  const success = !failed && timedOut && dousesHit >= config.requiredDouses && fearMeter <= config.successFearThreshold;

  return {
    ...state,
    elapsedMs,
    lane,
    fearMeter,
    courageMeter,
    dousesHit,
    douseMisses,
    nextPatternIndex,
    scarecrowWindowUsed,
    tinWardUsed,
    lionSteadyUsed,
    tinWardRemainingMs,
    lionSteadyRemainingMs,
    clearSwellRemainingMs,
    commandTriggers,
    spentCommandThisStep,
    done: failed || timedOut,
    success
  };
}

export function dousingScore(state: DousingState, config: DousingTheShadowConfig = DEFAULT_DOUSING_THE_SHADOW_CONFIG): number {
  const completion = state.success ? 520 : 100;
  const douseScore = state.dousesHit * 170;
  const fearScore = Math.round((1 - state.fearMeter) * 340);
  const missPenalty = state.douseMisses * 70;
  const speedScore = Math.max(0, Math.round((1 - state.elapsedMs / config.durationMs) * 180));
  return Math.max(0, completion + douseScore + fearScore + speedScore - missPenalty);
}

export function isDousingPerfect(state: DousingState, config: DousingTheShadowConfig = DEFAULT_DOUSING_THE_SHADOW_CONFIG): boolean {
  return state.success && state.dousesHit >= config.requiredDouses && state.douseMisses === 0 && state.fearMeter <= 0.2;
}
