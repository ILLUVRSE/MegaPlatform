import { createSeededRng, hashStringToSeed } from '../rng';

export interface KalidahChaseConfig {
  durationMs: number;
  laneCount: number;
  patternLength: number;
  baseGap: number;
  closeRatePerSecond: number;
  tokenGain: number;
  hitPenalty: number;
  burstBoost: number;
  roarBoost: number;
  surviveGap: number;
  logMaskChance: number;
  narrowMaskChance: number;
}

export interface KalidahChaseAssist {
  tinGuardHits: number;
  roarCharges: number;
}

export interface KalidahChaseState {
  elapsedMs: number;
  runnerLane: number;
  gap: number;
  tokens: number;
  hits: number;
  burstsUsed: number;
  roarsUsed: number;
  nextPatternIndex: number;
  done: boolean;
  success: boolean;
  logMasks: Uint8Array;
  narrowMasks: Uint8Array;
  tokenLanes: Uint8Array;
  remainingTinGuard: number;
  remainingRoars: number;
}

export interface KalidahInput {
  laneShift: -1 | 0 | 1;
  burst: boolean;
  roar: boolean;
}

export const DEFAULT_KALIDAH_CONFIG: KalidahChaseConfig = {
  durationMs: 14000,
  laneCount: 3,
  patternLength: 28,
  baseGap: 0.68,
  closeRatePerSecond: 0.075,
  tokenGain: 0.09,
  hitPenalty: 0.16,
  burstBoost: 0.12,
  roarBoost: 0.18,
  surviveGap: 0.18,
  logMaskChance: 0.38,
  narrowMaskChance: 0.34
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampLane(lane: number, laneCount: number): number {
  return clamp(Math.round(lane), 0, laneCount - 1);
}

export function buildKalidahPattern(seed: number, config: KalidahChaseConfig = DEFAULT_KALIDAH_CONFIG): {
  logMasks: Uint8Array;
  narrowMasks: Uint8Array;
  tokenLanes: Uint8Array;
} {
  const rng = createSeededRng((seed ^ hashStringToSeed('kalidah-chase-pattern')) >>> 0);
  const logMasks = new Uint8Array(config.patternLength);
  const narrowMasks = new Uint8Array(config.patternLength);
  const tokenLanes = new Uint8Array(config.patternLength);

  for (let i = 0; i < config.patternLength; i += 1) {
    let logMask = 0;
    let narrowMask = 0;
    for (let lane = 0; lane < config.laneCount; lane += 1) {
      if (rng.next() < config.logMaskChance) logMask |= 1 << lane;
      if (rng.next() < config.narrowMaskChance) narrowMask |= 1 << lane;
    }
    const safeLane = rng.nextInt(0, config.laneCount - 1);
    logMask &= ~(1 << safeLane);
    narrowMask &= ~(1 << safeLane);
    logMasks[i] = logMask;
    narrowMasks[i] = narrowMask;
    tokenLanes[i] = rng.nextInt(0, config.laneCount - 1);
  }

  return { logMasks, narrowMasks, tokenLanes };
}

export function safestLaneAt(state: KalidahChaseState, index: number, config: KalidahChaseConfig = DEFAULT_KALIDAH_CONFIG): number {
  const i = index % state.logMasks.length;
  const logMask = state.logMasks[i] ?? 0;
  const narrowMask = state.narrowMasks[i] ?? 0;
  for (let lane = 0; lane < config.laneCount; lane += 1) {
    const blocked = ((logMask >> lane) & 1) === 1 || ((narrowMask >> lane) & 1) === 1;
    if (!blocked) return lane;
  }
  return 0;
}

export function createKalidahChaseState(
  seed: number,
  assist: KalidahChaseAssist = { tinGuardHits: 0, roarCharges: 0 },
  config: KalidahChaseConfig = DEFAULT_KALIDAH_CONFIG
): KalidahChaseState {
  const pattern = buildKalidahPattern(seed, config);
  return {
    elapsedMs: 0,
    runnerLane: 1,
    gap: config.baseGap,
    tokens: 0,
    hits: 0,
    burstsUsed: 0,
    roarsUsed: 0,
    nextPatternIndex: 0,
    done: false,
    success: false,
    logMasks: pattern.logMasks,
    narrowMasks: pattern.narrowMasks,
    tokenLanes: pattern.tokenLanes,
    remainingTinGuard: Math.max(0, Math.round(assist.tinGuardHits)),
    remainingRoars: Math.max(0, Math.round(assist.roarCharges))
  };
}

function eventHit(mask: number, lane: number): boolean {
  return ((mask >> lane) & 1) === 1;
}

export function stepKalidahChase(
  state: KalidahChaseState,
  input: KalidahInput,
  deltaMs: number,
  config: KalidahChaseConfig = DEFAULT_KALIDAH_CONFIG
): KalidahChaseState {
  if (state.done) return state;

  const elapsedMs = state.elapsedMs + deltaMs;
  let lane = clampLane(state.runnerLane + input.laneShift, config.laneCount);
  let gap = clamp(state.gap - config.closeRatePerSecond * (deltaMs / 1000), 0, 1);
  let tokens = state.tokens;
  let hits = state.hits;
  let burstsUsed = state.burstsUsed;
  let roarsUsed = state.roarsUsed;
  let remainingTinGuard = state.remainingTinGuard;
  let remainingRoars = state.remainingRoars;

  if (input.burst) {
    gap = clamp(gap + config.burstBoost, 0, 1);
    burstsUsed += 1;
  }

  if (input.roar && remainingRoars > 0) {
    gap = clamp(gap + config.roarBoost, 0, 1);
    remainingRoars -= 1;
    roarsUsed += 1;
  }

  const eventLengthMs = config.durationMs / config.patternLength;
  let index = state.nextPatternIndex;
  while (index < config.patternLength && elapsedMs >= (index + 1) * eventLengthMs) {
    if (state.tokenLanes[index] === lane) {
      tokens += 1;
      gap = clamp(gap + config.tokenGain, 0, 1);
    }

    const obstacle = eventHit(state.logMasks[index] ?? 0, lane) || eventHit(state.narrowMasks[index] ?? 0, lane);
    if (obstacle) {
      if (remainingTinGuard > 0) {
        remainingTinGuard -= 1;
      } else {
        hits += 1;
        gap = clamp(gap - config.hitPenalty, 0, 1);
      }
    }

    const bestLane = safestLaneAt(state, index, config);
    if (obstacle && bestLane !== lane) {
      lane = bestLane;
    }

    index += 1;
  }

  const failed = gap <= 0;
  const completed = elapsedMs >= config.durationMs;

  return {
    ...state,
    elapsedMs,
    runnerLane: lane,
    gap,
    tokens,
    hits,
    burstsUsed,
    roarsUsed,
    nextPatternIndex: index,
    remainingTinGuard,
    remainingRoars,
    done: failed || completed,
    success: !failed && completed && gap >= config.surviveGap
  };
}

export function kalidahChaseScore(state: KalidahChaseState): number {
  const completionBonus = state.success ? 400 : 0;
  const score = Math.round(state.gap * 620 + state.tokens * 130 - state.hits * 150 + completionBonus);
  if (state.success) {
    return Math.max(350, score);
  }
  return Math.max(0, score);
}
