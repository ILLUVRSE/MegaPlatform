import { createSeededRng, hashStringToSeed } from '../rng';

export interface PoppyRescueConfig {
  durationMs: number;
  laneCount: number;
  patternLength: number;
  targetProgress: number;
  baseProgressPerSecond: number;
  sleepGainPerCloud: number;
  sleepRecoveryPerSecond: number;
  heavyCloudChance: number;
  slowFactor: number;
  lionSleepPenalty: number;
}

export interface PoppyRescueAssist {
  tinAndScarecrowRescueBoost: number;
  lionCourageResist: number;
}

export interface PoppyRescueState {
  elapsedMs: number;
  lane: number;
  progress: number;
  sleepMeter: number;
  nextPatternIndex: number;
  done: boolean;
  success: boolean;
  lightCloudMasks: Uint8Array;
  heavyCloudMasks: Uint8Array;
  stunMs: number;
}

export interface PoppyRescueInput {
  laneShift: -1 | 0 | 1;
  steeringHold: boolean;
}

export const DEFAULT_POPPY_RESCUE_CONFIG: PoppyRescueConfig = {
  durationMs: 12500,
  laneCount: 3,
  patternLength: 30,
  targetProgress: 100,
  baseProgressPerSecond: 11,
  sleepGainPerCloud: 0.095,
  sleepRecoveryPerSecond: 0.04,
  heavyCloudChance: 0.28,
  slowFactor: 0.45,
  lionSleepPenalty: 0.12
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

export function buildPoppyHazards(seed: number, config: PoppyRescueConfig = DEFAULT_POPPY_RESCUE_CONFIG): {
  lightCloudMasks: Uint8Array;
  heavyCloudMasks: Uint8Array;
} {
  const rng = createSeededRng((seed ^ hashStringToSeed('poppy-rescue-hazards')) >>> 0);
  const lightCloudMasks = new Uint8Array(config.patternLength);
  const heavyCloudMasks = new Uint8Array(config.patternLength);

  for (let i = 0; i < config.patternLength; i += 1) {
    let lightMask = 0;
    let heavyMask = 0;
    for (let lane = 0; lane < config.laneCount; lane += 1) {
      const hasLight = rng.next() < 0.45;
      if (hasLight) {
        lightMask |= 1 << lane;
      }
      if (hasLight && rng.next() < config.heavyCloudChance) {
        heavyMask |= 1 << lane;
      }
    }
    const clearLane = rng.nextInt(0, config.laneCount - 1);
    lightMask &= ~(1 << clearLane);
    heavyMask &= ~(1 << clearLane);

    lightCloudMasks[i] = lightMask;
    heavyCloudMasks[i] = heavyMask;
  }

  return { lightCloudMasks, heavyCloudMasks };
}

export function createPoppyRescueState(seed: number, config: PoppyRescueConfig = DEFAULT_POPPY_RESCUE_CONFIG): PoppyRescueState {
  const hazards = buildPoppyHazards(seed, config);
  return {
    elapsedMs: 0,
    lane: 1,
    progress: 0,
    sleepMeter: 0,
    nextPatternIndex: 0,
    done: false,
    success: false,
    lightCloudMasks: hazards.lightCloudMasks,
    heavyCloudMasks: hazards.heavyCloudMasks,
    stunMs: 0
  };
}

export function stepPoppyRescue(
  state: PoppyRescueState,
  input: PoppyRescueInput,
  deltaMs: number,
  assist: PoppyRescueAssist,
  config: PoppyRescueConfig = DEFAULT_POPPY_RESCUE_CONFIG
): PoppyRescueState {
  if (state.done) return state;

  const elapsedMs = state.elapsedMs + deltaMs;
  let lane = clampLane(state.lane + input.laneShift, config.laneCount);
  let nextPatternIndex = state.nextPatternIndex;
  let sleepMeter = state.sleepMeter;
  let progress = state.progress;
  let stunMs = Math.max(0, state.stunMs - deltaMs);

  const eventLengthMs = config.durationMs / config.patternLength;
  while (nextPatternIndex < config.patternLength && elapsedMs >= (nextPatternIndex + 1) * eventLengthMs) {
    const inLight = eventHit(state.lightCloudMasks[nextPatternIndex] ?? 0, lane);
    const inHeavy = eventHit(state.heavyCloudMasks[nextPatternIndex] ?? 0, lane);

    if (inHeavy) {
      stunMs = Math.max(stunMs, 320);
      sleepMeter += config.sleepGainPerCloud + 0.04;
    } else if (inLight) {
      sleepMeter += config.sleepGainPerCloud;
    } else {
      sleepMeter -= config.sleepRecoveryPerSecond * (eventLengthMs / 1000);
    }

    if (!inLight && !inHeavy && input.steeringHold) {
      lane = clampLane(lane + 1, config.laneCount);
    }

    nextPatternIndex += 1;
  }

  const movingFactor = stunMs > 0 ? 0.25 : 1;
  const cloudSlow = Math.max(0.3, 1 - sleepMeter * config.slowFactor);
  const baseGain = (config.baseProgressPerSecond + assist.tinAndScarecrowRescueBoost) * (deltaMs / 1000);
  progress += baseGain * movingFactor * cloudSlow;

  sleepMeter += config.lionSleepPenalty * Math.max(0, 1 - assist.lionCourageResist) * (deltaMs / config.durationMs);
  sleepMeter -= config.sleepRecoveryPerSecond * (deltaMs / 1000);
  sleepMeter = clamp(sleepMeter, 0, 1);

  const success = progress >= config.targetProgress;
  const fail = sleepMeter >= 1 || elapsedMs >= config.durationMs;

  return {
    ...state,
    elapsedMs,
    lane,
    progress,
    sleepMeter,
    nextPatternIndex,
    stunMs,
    done: success || fail,
    success
  };
}

export function poppyRescueScore(state: PoppyRescueState, config: PoppyRescueConfig = DEFAULT_POPPY_RESCUE_CONFIG): number {
  const progressRatio = Math.min(1, state.progress / config.targetProgress);
  const completionBonus = state.success ? 360 : 0;
  return Math.max(0, Math.round(progressRatio * 780 + (1 - state.sleepMeter) * 240 + completionBonus));
}
