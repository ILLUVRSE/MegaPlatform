import { createSeededRng, hashStringToSeed } from '../rng';

export interface WesternHoldEscapeConfig {
  durationMs: number;
  laneCount: number;
  patternLength: number;
  targetTokens: number;
  baseAlarmPerSecond: number;
  sweepAlarmPerEvent: number;
  hazardAlarmPerEvent: number;
  coverRecoveryPerEvent: number;
  clearRecoveryPerEvent: number;
  commandSafeMs: number;
  scarecrowRevealMs: number;
  scarecrowRevealCooldownMs: number;
  lionPauseMs: number;
  successAlarmThreshold: number;
  patrolChance: number;
  coverChance: number;
  hazardChance: number;
}

export interface WesternHoldAssist {
  scarecrowReveal: boolean;
  tinLift: boolean;
  lionPause: boolean;
  goldenCapReady: boolean;
}

export interface WesternHoldEscapeInput {
  laneShift: -1 | 0 | 1;
  hide: boolean;
  useScarecrowReveal: boolean;
  useTinLift: boolean;
  useLionPause: boolean;
  useCommand: boolean;
}

export interface WesternHoldEscapeState {
  elapsedMs: number;
  lane: number;
  alarm: number;
  tokensCollected: number;
  barriersPassed: number;
  detections: number;
  nextPatternIndex: number;
  done: boolean;
  success: boolean;
  patrolMasks: Uint8Array;
  coverMasks: Uint8Array;
  hazardMasks: Uint8Array;
  tokenLanes: Uint8Array;
  revealRemainingMs: number;
  revealCooldownMs: number;
  revealedLane: number | null;
  lionPauseRemainingMs: number;
  commandSafeRemainingMs: number;
  tinLiftUsed: boolean;
  lionPauseUsed: boolean;
  commandTriggers: number;
  spentCommandThisStep: boolean;
}

export const DEFAULT_WESTERN_HOLD_ESCAPE_CONFIG: WesternHoldEscapeConfig = {
  durationMs: 14000,
  laneCount: 3,
  patternLength: 32,
  targetTokens: 3,
  baseAlarmPerSecond: 0.026,
  sweepAlarmPerEvent: 0.13,
  hazardAlarmPerEvent: 0.18,
  coverRecoveryPerEvent: 0.06,
  clearRecoveryPerEvent: 0.02,
  commandSafeMs: 2000,
  scarecrowRevealMs: 1000,
  scarecrowRevealCooldownMs: 3000,
  lionPauseMs: 750,
  successAlarmThreshold: 0.88,
  patrolChance: 0.45,
  coverChance: 0.36,
  hazardChance: 0.34
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

export function buildWesternHoldLayout(
  seed: number,
  difficultyMultiplier: number,
  nodeId: string,
  config: WesternHoldEscapeConfig = DEFAULT_WESTERN_HOLD_ESCAPE_CONFIG
): {
  patrolMasks: Uint8Array;
  coverMasks: Uint8Array;
  hazardMasks: Uint8Array;
  tokenLanes: Uint8Array;
} {
  const rng = createSeededRng((seed ^ hashStringToSeed(`western-hold-escape:${nodeId}:${difficultyMultiplier.toFixed(3)}`)) >>> 0);
  const patrolMasks = new Uint8Array(config.patternLength);
  const coverMasks = new Uint8Array(config.patternLength);
  const hazardMasks = new Uint8Array(config.patternLength);
  const tokenLanes = new Uint8Array(config.patternLength);

  const tunedPatrolChance = clamp(config.patrolChance * difficultyMultiplier, 0.2, 0.88);
  const tunedHazardChance = clamp(config.hazardChance * difficultyMultiplier, 0.18, 0.8);
  const tunedCoverChance = clamp(config.coverChance / difficultyMultiplier, 0.16, 0.66);

  for (let i = 0; i < config.patternLength; i += 1) {
    let patrolMask = 0;
    let coverMask = 0;
    let hazardMask = 0;

    for (let lane = 0; lane < config.laneCount; lane += 1) {
      if (rng.next() < tunedPatrolChance) patrolMask |= 1 << lane;
      if (rng.next() < tunedCoverChance) coverMask |= 1 << lane;
      if (rng.next() < tunedHazardChance) hazardMask |= 1 << lane;
    }

    const safeLane = rng.nextInt(0, config.laneCount - 1);
    patrolMask &= ~(1 << safeLane);
    hazardMask &= ~(1 << safeLane);
    coverMask |= 1 << safeLane;

    patrolMasks[i] = patrolMask;
    coverMasks[i] = coverMask;
    hazardMasks[i] = hazardMask;
    tokenLanes[i] = rng.next() < 0.7 ? safeLane : rng.nextInt(0, config.laneCount - 1);
  }

  return {
    patrolMasks,
    coverMasks,
    hazardMasks,
    tokenLanes
  };
}

export function safestLaneAt(
  state: WesternHoldEscapeState,
  index: number,
  config: WesternHoldEscapeConfig = DEFAULT_WESTERN_HOLD_ESCAPE_CONFIG
): number {
  const i = index % state.patrolMasks.length;
  const patrol = state.patrolMasks[i] ?? 0;
  const hazard = state.hazardMasks[i] ?? 0;
  const cover = state.coverMasks[i] ?? 0;

  for (let lane = 0; lane < config.laneCount; lane += 1) {
    const blocked = ((patrol >> lane) & 1) === 1 || ((hazard >> lane) & 1) === 1;
    const covered = ((cover >> lane) & 1) === 1;
    if (!blocked && covered) return lane;
  }

  for (let lane = 0; lane < config.laneCount; lane += 1) {
    const blocked = ((patrol >> lane) & 1) === 1 || ((hazard >> lane) & 1) === 1;
    if (!blocked) return lane;
  }

  return 0;
}

export function createWesternHoldEscapeState(
  seed: number,
  difficultyMultiplier: number,
  nodeId: string,
  config: WesternHoldEscapeConfig = DEFAULT_WESTERN_HOLD_ESCAPE_CONFIG
): WesternHoldEscapeState {
  const layout = buildWesternHoldLayout(seed, difficultyMultiplier, nodeId, config);
  return {
    elapsedMs: 0,
    lane: 1,
    alarm: 0,
    tokensCollected: 0,
    barriersPassed: 0,
    detections: 0,
    nextPatternIndex: 0,
    done: false,
    success: false,
    patrolMasks: layout.patrolMasks,
    coverMasks: layout.coverMasks,
    hazardMasks: layout.hazardMasks,
    tokenLanes: layout.tokenLanes,
    revealRemainingMs: 0,
    revealCooldownMs: 0,
    revealedLane: null,
    lionPauseRemainingMs: 0,
    commandSafeRemainingMs: 0,
    tinLiftUsed: false,
    lionPauseUsed: false,
    commandTriggers: 0,
    spentCommandThisStep: false
  };
}

export function stepWesternHoldEscape(
  state: WesternHoldEscapeState,
  input: WesternHoldEscapeInput,
  deltaMs: number,
  assist: WesternHoldAssist,
  config: WesternHoldEscapeConfig = DEFAULT_WESTERN_HOLD_ESCAPE_CONFIG
): WesternHoldEscapeState {
  if (state.done) return state;

  const elapsedMs = state.elapsedMs + deltaMs;
  let lane = clampLane(state.lane + input.laneShift, config.laneCount);
  let alarm = clamp(state.alarm + config.baseAlarmPerSecond * (deltaMs / 1000), 0, 1);
  let tokensCollected = state.tokensCollected;
  let barriersPassed = state.barriersPassed;
  let detections = state.detections;
  let nextPatternIndex = state.nextPatternIndex;

  let revealRemainingMs = Math.max(0, state.revealRemainingMs - deltaMs);
  let revealCooldownMs = Math.max(0, state.revealCooldownMs - deltaMs);
  let revealedLane = revealRemainingMs > 0 ? state.revealedLane : null;
  let lionPauseRemainingMs = Math.max(0, state.lionPauseRemainingMs - deltaMs);
  let commandSafeRemainingMs = Math.max(0, state.commandSafeRemainingMs - deltaMs);
  let tinLiftUsed = state.tinLiftUsed;
  let lionPauseUsed = state.lionPauseUsed;
  let commandTriggers = state.commandTriggers;
  let spentCommandThisStep = false;

  if (assist.scarecrowReveal && input.useScarecrowReveal && revealCooldownMs <= 0) {
    revealRemainingMs = config.scarecrowRevealMs;
    revealCooldownMs = config.scarecrowRevealCooldownMs;
    revealedLane = safestLaneAt(state, nextPatternIndex, config);
  }

  if (assist.lionPause && input.useLionPause && !lionPauseUsed) {
    lionPauseUsed = true;
    lionPauseRemainingMs = config.lionPauseMs;
  }

  if (assist.goldenCapReady && input.useCommand) {
    commandSafeRemainingMs = config.commandSafeMs;
    commandTriggers += 1;
    spentCommandThisStep = true;
  }

  const eventLengthMs = config.durationMs / config.patternLength;
  while (nextPatternIndex < config.patternLength && elapsedMs >= (nextPatternIndex + 1) * eventLengthMs) {
    const inPatrol = eventHit(state.patrolMasks[nextPatternIndex] ?? 0, lane);
    const inCover = eventHit(state.coverMasks[nextPatternIndex] ?? 0, lane);
    const inHazard = eventHit(state.hazardMasks[nextPatternIndex] ?? 0, lane);

    if (state.tokenLanes[nextPatternIndex] === lane) {
      tokensCollected += 1;
      alarm -= 0.08;
    }

    const safeByCommand = commandSafeRemainingMs > 0;
    const patrolPaused = lionPauseRemainingMs > 0;

    if (inHazard && !safeByCommand) {
      if (assist.tinLift && input.useTinLift && !tinLiftUsed) {
        tinLiftUsed = true;
        barriersPassed += 1;
      } else {
        alarm += config.hazardAlarmPerEvent;
        detections += 1;
      }
    }

    if (inPatrol && !patrolPaused && !safeByCommand && !(input.hide && inCover)) {
      alarm += config.sweepAlarmPerEvent;
      detections += 1;
    } else if (input.hide && inCover) {
      alarm -= config.coverRecoveryPerEvent;
    } else {
      alarm -= config.clearRecoveryPerEvent;
    }

    if (revealRemainingMs > 0) {
      revealedLane = safestLaneAt(state, nextPatternIndex, config);
    }

    nextPatternIndex += 1;
  }

  alarm = clamp(alarm, 0, 1);

  const failed = alarm >= 1;
  const timedOut = elapsedMs >= config.durationMs;
  const success = timedOut && !failed && alarm <= config.successAlarmThreshold && tokensCollected >= config.targetTokens;

  return {
    ...state,
    elapsedMs,
    lane,
    alarm,
    tokensCollected,
    barriersPassed,
    detections,
    nextPatternIndex,
    revealRemainingMs,
    revealCooldownMs,
    revealedLane,
    lionPauseRemainingMs,
    commandSafeRemainingMs,
    tinLiftUsed,
    lionPauseUsed,
    commandTriggers,
    spentCommandThisStep,
    done: failed || timedOut,
    success
  };
}

export function westernHoldEscapeScore(
  state: WesternHoldEscapeState,
  config: WesternHoldEscapeConfig = DEFAULT_WESTERN_HOLD_ESCAPE_CONFIG
): number {
  const completion = state.success ? 460 : 90;
  const tokenScore = state.tokensCollected * 150;
  const alarmScore = Math.round((1 - state.alarm) * 380);
  const speedScore = Math.max(0, Math.round((1 - state.elapsedMs / config.durationMs) * 230));
  const penalty = state.detections * 45;
  return Math.max(0, completion + tokenScore + alarmScore + speedScore - penalty);
}

export function isWesternHoldEscapePerfect(state: WesternHoldEscapeState, config: WesternHoldEscapeConfig = DEFAULT_WESTERN_HOLD_ESCAPE_CONFIG): boolean {
  return state.success && state.tokensCollected >= config.targetTokens && state.alarm <= 0.2 && state.detections <= 2;
}
