import { buildSwipeForTarget, resolveThrowFromSwipe } from './input';
import type { ThrowDartsTuning } from './config';
import { polarToBoardPoint } from './scoring';
import type {
  AiThrowPlan,
  CricketTarget,
  ThrowDartsCricketState,
  ThrowDartsDifficulty,
  ThrowDartsMatchState,
  ThrowDartsOptions,
  ThrowResolution
} from './types';

const CRICKET_PRIORITY: readonly CricketTarget[] = [20, 19, 18, 17, 16, 15, 'bull'] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function gaussianPair(u1: number, u2: number): { a: number; b: number } {
  const mag = Math.sqrt(-2 * Math.log(Math.max(0.0001, u1)));
  const theta = Math.PI * 2 * u2;
  return {
    a: mag * Math.cos(theta),
    b: mag * Math.sin(theta)
  };
}

function radiusForRing(ring: 'single_outer' | 'single_inner' | 'double' | 'triple' | 'outer_bull' | 'inner_bull'): number {
  switch (ring) {
    case 'double':
      return 166 / 170;
    case 'triple':
      return 103 / 170;
    case 'single_inner':
      return 72 / 170;
    case 'single_outer':
      return 135 / 170;
    case 'inner_bull':
      return 4 / 170;
    case 'outer_bull':
      return 11 / 170;
  }
}

function thetaForNumber(value: number): number {
  const order = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  const index = order.indexOf(value);
  const segment = (Math.PI * 2) / 20;
  return (index + 0.5) * segment;
}

function targetPointForNumber(number: number, ring: 'single_outer' | 'single_inner' | 'double' | 'triple') {
  return {
    radiusNormalized: radiusForRing(ring),
    theta: thetaForNumber(number)
  };
}

function chooseX01Target(
  remaining: number,
  difficulty: ThrowDartsDifficulty
): { number: number; ring: 'single_outer' | 'single_inner' | 'double' | 'triple' | 'outer_bull' | 'inner_bull' } {
  if (remaining === 50) return { number: 25, ring: 'inner_bull' };
  if (remaining <= 40 && remaining % 2 === 0) {
    return { number: remaining / 2, ring: 'double' };
  }
  if (remaining > 61) {
    return { number: 20, ring: 'triple' };
  }

  for (let n = 20; n >= 1; n -= 1) {
    const next = remaining - n;
    if (next <= 40 && next > 1 && next % 2 === 0) {
      return { number: n, ring: 'single_outer' };
    }
  }

  if (remaining <= 60) {
    return { number: 20, ring: 'single_inner' };
  }

  if (difficulty === 'hard' || difficulty === 'pro') {
    if (remaining <= 70) return { number: 19, ring: 'single_inner' };
    if (remaining <= 99) return { number: 19, ring: 'triple' };
  }

  return { number: 20, ring: 'triple' };
}

function chooseCricketTarget(state: ThrowDartsCricketState): { number: number; ring: 'single_outer' | 'double' | 'triple' | 'outer_bull' } {
  const current = state.players[state.currentPlayer];
  const opponent = state.players[state.currentPlayer === 0 ? 1 : 0];

  for (let i = 0; i < CRICKET_PRIORITY.length; i += 1) {
    const target = CRICKET_PRIORITY[i];
    if (current.marks[target] < 3) {
      if (target === 'bull') return { number: 25, ring: 'outer_bull' };
      return { number: target, ring: 'triple' };
    }
  }

  if (current.points >= opponent.points) {
    return { number: 20, ring: 'triple' };
  }

  for (let i = 0; i < CRICKET_PRIORITY.length; i += 1) {
    const target = CRICKET_PRIORITY[i];
    if (target === 'bull') {
      if (current.marks.bull >= 3 && opponent.marks.bull < 3) {
        return { number: 25, ring: 'outer_bull' };
      }
      continue;
    }
    if (current.marks[target] >= 3 && opponent.marks[target] < 3) {
      return { number: target, ring: 'triple' };
    }
  }

  return { number: 20, ring: 'triple' };
}

function noiseRadiusForDifficulty(difficulty: ThrowDartsDifficulty): number {
  switch (difficulty) {
    case 'easy':
      return 46;
    case 'medium':
      return 26;
    case 'hard':
      return 14;
    case 'pro':
      return 9;
  }
}

function meterPhaseForDifficulty(difficulty: ThrowDartsDifficulty, randA: number): number {
  const spread = difficulty === 'easy' ? 0.46 : difficulty === 'medium' ? 0.22 : difficulty === 'hard' ? 0.12 : 0.07;
  return clamp(0.5 + (randA - 0.5) * spread, 0.05, 0.95);
}

export interface ThrowDartsAiState {
  seed: number;
}

export function createThrowDartsAiState(seed = 0.391): ThrowDartsAiState {
  return { seed };
}

export function stepAiSeed(state: ThrowDartsAiState): { state: ThrowDartsAiState; random: number } {
  const next = (state.seed * 1664525 + 1013904223) % 4294967296;
  const random = next / 4294967296;
  return {
    state: { seed: next },
    random
  };
}

export function planAiThrow(
  state: ThrowDartsMatchState,
  options: ThrowDartsOptions,
  boardCenterX: number,
  boardCenterY: number,
  boardRadius: number,
  aiState: ThrowDartsAiState,
  tuning: ThrowDartsTuning
): { aiState: ThrowDartsAiState; plan: AiThrowPlan; resolution: ThrowResolution } {
  const a = stepAiSeed(aiState);
  const b = stepAiSeed(a.state);
  const c = stepAiSeed(b.state);
  const d = stepAiSeed(c.state);
  const e = stepAiSeed(d.state);

  let targetX = boardCenterX;
  let targetY = boardCenterY;

  if (state.kind === 'x01') {
    const remaining = state.players[state.currentPlayer].remaining;
    const focus = tuning.difficulty[options.difficulty]?.checkoutFocus ?? 0.5;
    const pick =
      remaining <= 170 && a.random > focus
        ? { number: 20, ring: 'triple' }
        : chooseX01Target(remaining, options.difficulty);
    if (pick.number === 25) {
      const bullRadius = pick.ring === 'inner_bull' ? radiusForRing('inner_bull') : radiusForRing('outer_bull');
      const p = polarToBoardPoint(bullRadius, 0, { centerX: boardCenterX, centerY: boardCenterY, radius: boardRadius });
      targetX = p.x;
      targetY = p.y;
      if (options.difficulty !== 'pro') {
        targetX += (options.difficulty === 'easy' ? 12 : 6);
        targetY += (options.difficulty === 'easy' ? -8 : -4);
      }
    } else {
      const ring =
        pick.ring === 'double'
          ? 'double'
          : pick.ring === 'triple'
            ? 'triple'
            : pick.ring === 'single_inner'
              ? 'single_inner'
              : 'single_outer';
      const point = targetPointForNumber(pick.number, ring);
      const p = polarToBoardPoint(point.radiusNormalized, point.theta, {
        centerX: boardCenterX,
        centerY: boardCenterY,
        radius: boardRadius
      });
      targetX = p.x;
      targetY = p.y;
    }
  } else if (state.kind === 'cricket') {
    const pick = chooseCricketTarget(state);
    if (pick.number === 25) {
      const p = polarToBoardPoint(radiusForRing('outer_bull'), 0, {
        centerX: boardCenterX,
        centerY: boardCenterY,
        radius: boardRadius
      });
      targetX = p.x;
      targetY = p.y;
    } else {
      const point = targetPointForNumber(pick.number, pick.ring === 'double' ? 'double' : pick.ring === 'triple' ? 'triple' : 'single_outer');
      const p = polarToBoardPoint(point.radiusNormalized, point.theta, {
        centerX: boardCenterX,
        centerY: boardCenterY,
        radius: boardRadius
      });
      targetX = p.x;
      targetY = p.y;
    }
  }

  const tuningNoise = tuning.difficulty[options.difficulty]?.aimNoise ?? 0.07;
  const deviation = noiseRadiusForDifficulty(options.difficulty) * (1 + tuningNoise);
  const gaussian = gaussianPair(Math.max(0.0001, b.random), c.random);
  targetX += gaussian.a * deviation;
  targetY += gaussian.b * deviation;

  const meterPhase = options.timingMeter
    ? meterPhaseForDifficulty(options.difficulty, d.random)
    : meterPhaseForDifficulty(options.difficulty, e.random);

  const aiOptions = { ...options, assistLevel: 'off', reducedRandomness: true };
  const swipe = buildSwipeForTarget(targetX, targetY, aiOptions, boardCenterX, boardCenterY, meterPhase);
  const resolution = resolveThrowFromSwipe(swipe, aiOptions, boardCenterX, boardCenterY);

  return {
    aiState: e.state,
    plan: {
      target: { x: targetX, y: targetY },
      meterPhase
    },
    resolution
  };
}
