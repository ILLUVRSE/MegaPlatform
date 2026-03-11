import { createSeededRng, hashStringToSeed } from '../rng';

export interface ShadowOfTheWestConfig {
  durationMs: number;
  laneCount: number;
  patternLength: number;
  baseExposurePerSecond: number;
  sweepExposurePerEvent: number;
  coverRecoveryPerEvent: number;
  clearRecoveryPerEvent: number;
  tokenExposureDrop: number;
  revealMs: number;
  tinWardMs: number;
  tinWardReduction: number;
  lionSteadyMs: number;
  successExposureThreshold: number;
  sweepChance: number;
  coverChance: number;
}

export interface ShadowOfTheWestAssist {
  scarecrowReveal: boolean;
  tinWard: boolean;
  lionSteadyBreath: boolean;
}

export interface ShadowOfTheWestState {
  elapsedMs: number;
  lane: number;
  exposure: number;
  rescueTokens: number;
  detections: number;
  nextPatternIndex: number;
  done: boolean;
  success: boolean;
  sweepMasks: Uint8Array;
  coverMasks: Uint8Array;
  tokenLanes: Uint8Array;
  revealedSafeLane: number | null;
  revealRemainingMs: number;
  tinWardRemainingMs: number;
  lionSteadyRemainingMs: number;
  tinWardUsed: boolean;
  lionSteadyUsed: boolean;
}

export interface ShadowOfTheWestInput {
  laneShift: -1 | 0 | 1;
  hide: boolean;
  triggerTinWard: boolean;
  triggerLionSteady: boolean;
}

export const DEFAULT_SHADOW_OF_THE_WEST_CONFIG: ShadowOfTheWestConfig = {
  durationMs: 13000,
  laneCount: 3,
  patternLength: 30,
  baseExposurePerSecond: 0.022,
  sweepExposurePerEvent: 0.12,
  coverRecoveryPerEvent: 0.05,
  clearRecoveryPerEvent: 0.022,
  tokenExposureDrop: 0.1,
  revealMs: 1800,
  tinWardMs: 2200,
  tinWardReduction: 0.28,
  lionSteadyMs: 1000,
  successExposureThreshold: 0.84,
  sweepChance: 0.44,
  coverChance: 0.38
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

export function buildShadowPattern(
  seed: number,
  difficultyMultiplier: number,
  config: ShadowOfTheWestConfig = DEFAULT_SHADOW_OF_THE_WEST_CONFIG
): {
  sweepMasks: Uint8Array;
  coverMasks: Uint8Array;
  tokenLanes: Uint8Array;
} {
  const rng = createSeededRng((seed ^ hashStringToSeed(`shadow-of-the-west:${difficultyMultiplier.toFixed(3)}`)) >>> 0);
  const sweepMasks = new Uint8Array(config.patternLength);
  const coverMasks = new Uint8Array(config.patternLength);
  const tokenLanes = new Uint8Array(config.patternLength);

  const tunedSweepChance = clamp(config.sweepChance * difficultyMultiplier, 0.2, 0.88);
  const tunedCoverChance = clamp(config.coverChance / difficultyMultiplier, 0.18, 0.66);

  for (let i = 0; i < config.patternLength; i += 1) {
    let sweepMask = 0;
    let coverMask = 0;

    for (let lane = 0; lane < config.laneCount; lane += 1) {
      if (rng.next() < tunedSweepChance) sweepMask |= 1 << lane;
      if (rng.next() < tunedCoverChance) coverMask |= 1 << lane;
    }

    const safeLane = rng.nextInt(0, config.laneCount - 1);
    sweepMask &= ~(1 << safeLane);
    coverMask |= 1 << safeLane;

    sweepMasks[i] = sweepMask;
    coverMasks[i] = coverMask;
    tokenLanes[i] = rng.next() < 0.65 ? safeLane : rng.nextInt(0, config.laneCount - 1);
  }

  return { sweepMasks, coverMasks, tokenLanes };
}

export function safestCoverLaneAt(
  state: ShadowOfTheWestState,
  index: number,
  config: ShadowOfTheWestConfig = DEFAULT_SHADOW_OF_THE_WEST_CONFIG
): number {
  const i = index % state.sweepMasks.length;
  const sweepMask = state.sweepMasks[i] ?? 0;
  const coverMask = state.coverMasks[i] ?? 0;

  for (let lane = 0; lane < config.laneCount; lane += 1) {
    const swept = ((sweepMask >> lane) & 1) === 1;
    const covered = ((coverMask >> lane) & 1) === 1;
    if (!swept && covered) return lane;
  }

  for (let lane = 0; lane < config.laneCount; lane += 1) {
    if (((coverMask >> lane) & 1) === 1) return lane;
  }

  return 0;
}

export function createShadowOfTheWestState(
  seed: number,
  difficultyMultiplier: number,
  assist: ShadowOfTheWestAssist,
  config: ShadowOfTheWestConfig = DEFAULT_SHADOW_OF_THE_WEST_CONFIG
): ShadowOfTheWestState {
  const pattern = buildShadowPattern(seed, difficultyMultiplier, config);
  return {
    elapsedMs: 0,
    lane: 1,
    exposure: 0,
    rescueTokens: 0,
    detections: 0,
    nextPatternIndex: 0,
    done: false,
    success: false,
    sweepMasks: pattern.sweepMasks,
    coverMasks: pattern.coverMasks,
    tokenLanes: pattern.tokenLanes,
    revealedSafeLane: assist.scarecrowReveal ? safestCoverLaneAt({
      elapsedMs: 0,
      lane: 1,
      exposure: 0,
      rescueTokens: 0,
      detections: 0,
      nextPatternIndex: 0,
      done: false,
      success: false,
      sweepMasks: pattern.sweepMasks,
      coverMasks: pattern.coverMasks,
      tokenLanes: pattern.tokenLanes,
      revealRemainingMs: 0,
      tinWardRemainingMs: 0,
      lionSteadyRemainingMs: 0,
      tinWardUsed: false,
      lionSteadyUsed: false,
      revealedSafeLane: null
    }, 0, config) : null,
    revealRemainingMs: assist.scarecrowReveal ? config.revealMs : 0,
    tinWardRemainingMs: 0,
    lionSteadyRemainingMs: 0,
    tinWardUsed: false,
    lionSteadyUsed: false
  };
}

export function stepShadowOfTheWest(
  state: ShadowOfTheWestState,
  input: ShadowOfTheWestInput,
  deltaMs: number,
  assist: ShadowOfTheWestAssist,
  config: ShadowOfTheWestConfig = DEFAULT_SHADOW_OF_THE_WEST_CONFIG
): ShadowOfTheWestState {
  if (state.done) return state;

  const elapsedMs = state.elapsedMs + deltaMs;
  let lane = clampLane(state.lane + input.laneShift, config.laneCount);
  let exposure = clamp(state.exposure + config.baseExposurePerSecond * (deltaMs / 1000), 0, 1);
  let rescueTokens = state.rescueTokens;
  let detections = state.detections;
  let nextPatternIndex = state.nextPatternIndex;
  let revealRemainingMs = Math.max(0, state.revealRemainingMs - deltaMs);
  let tinWardRemainingMs = Math.max(0, state.tinWardRemainingMs - deltaMs);
  let lionSteadyRemainingMs = Math.max(0, state.lionSteadyRemainingMs - deltaMs);
  let tinWardUsed = state.tinWardUsed;
  let lionSteadyUsed = state.lionSteadyUsed;
  let revealedSafeLane = revealRemainingMs > 0 ? state.revealedSafeLane : null;

  if (assist.tinWard && input.triggerTinWard && !tinWardUsed) {
    tinWardUsed = true;
    tinWardRemainingMs = config.tinWardMs;
  }

  if (assist.lionSteadyBreath && input.triggerLionSteady && !lionSteadyUsed) {
    lionSteadyUsed = true;
    lionSteadyRemainingMs = config.lionSteadyMs;
  }

  const eventLengthMs = config.durationMs / config.patternLength;
  while (nextPatternIndex < config.patternLength && elapsedMs >= (nextPatternIndex + 1) * eventLengthMs) {
    const inSweep = eventHit(state.sweepMasks[nextPatternIndex] ?? 0, lane);
    const inCover = eventHit(state.coverMasks[nextPatternIndex] ?? 0, lane);

    if (state.tokenLanes[nextPatternIndex] === lane) {
      rescueTokens += 1;
      exposure -= config.tokenExposureDrop;
    }

    const hiddenFromSweep = input.hide && inCover;
    if (inSweep && !hiddenFromSweep) {
      let gain = config.sweepExposurePerEvent;
      if (tinWardRemainingMs > 0) {
        gain *= 1 - config.tinWardReduction;
      }
      if (lionSteadyRemainingMs > 0) {
        gain = 0;
      }
      exposure += gain;
      detections += gain > 0 ? 1 : 0;
    } else if (hiddenFromSweep) {
      exposure -= config.coverRecoveryPerEvent;
    } else {
      exposure -= config.clearRecoveryPerEvent;
    }

    if (assist.scarecrowReveal && revealRemainingMs > 0) {
      revealedSafeLane = safestCoverLaneAt(state, nextPatternIndex, config);
    }

    nextPatternIndex += 1;
  }

  exposure = clamp(exposure, 0, 1);

  const failed = exposure >= 1;
  const timedOut = elapsedMs >= config.durationMs;
  const success = timedOut && !failed && exposure <= config.successExposureThreshold;

  return {
    ...state,
    elapsedMs,
    lane,
    exposure,
    rescueTokens,
    detections,
    nextPatternIndex,
    revealRemainingMs,
    tinWardRemainingMs,
    lionSteadyRemainingMs,
    tinWardUsed,
    lionSteadyUsed,
    revealedSafeLane,
    done: failed || timedOut,
    success
  };
}

export function shadowOfTheWestScore(state: ShadowOfTheWestState, config: ShadowOfTheWestConfig = DEFAULT_SHADOW_OF_THE_WEST_CONFIG): number {
  const completion = state.success ? 420 : 80;
  const tokenScore = state.rescueTokens * 85;
  const stealthScore = Math.round((1 - state.exposure) * 420);
  const detectionPenalty = state.detections * 35;
  const speedScore = Math.max(0, Math.round((1 - state.elapsedMs / config.durationMs) * 210));
  return Math.max(0, completion + tokenScore + stealthScore + speedScore - detectionPenalty);
}

export function isShadowOfTheWestPerfect(state: ShadowOfTheWestState): boolean {
  return state.success && state.exposure <= 0.22 && state.detections <= 2;
}
