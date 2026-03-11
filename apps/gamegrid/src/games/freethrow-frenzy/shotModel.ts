import { DIFFICULTY_PRESETS, TIMING_TUNING, clamp } from './config/tuning';
import { classifyTiming, computeTimingWindow as computeTimingWindowBase } from './mechanics/timing';
import type { ShotArcParams, ShotEvaluationContext, ShotInput, ShotOutcome } from './types';

function difficultyBaseVariance(difficulty: ShotEvaluationContext['difficulty']): number {
  switch (difficulty) {
    case 'easy':
      return 20;
    case 'pro':
      return 7;
    case 'hard':
      return 9;
    default:
      return 14;
  }
}

function difficultyReleasePenalty(difficulty: ShotEvaluationContext['difficulty']): number {
  switch (difficulty) {
    case 'easy':
      return 0.9;
    case 'pro':
      return 1.35;
    case 'hard':
      return 1.2;
    default:
      return 1;
  }
}

export function computeTimingWindow(context: ShotEvaluationContext): number {
  const preset = DIFFICULTY_PRESETS[context.difficulty];
  const pressure = context.pressureEnabled ? context.pressure : 0;
  const window = computeTimingWindowBase(TIMING_TUNING, preset.timingScale, pressure);
  const distancePenalty = context.spot.distanceScore * 0.012;
  const assistBonus = context.assist ? 0.01 : 0;
  return clamp(window.green + assistBonus - distancePenalty, 0.05, 0.24);
}

function computeTimingQuality(input: ShotInput, context: ShotEvaluationContext): number {
  if (!context.timingMeter) return 1;
  const preset = DIFFICULTY_PRESETS[context.difficulty];
  const pressure = context.pressureEnabled ? context.pressure : 0;
  const window = computeTimingWindowBase(TIMING_TUNING, preset.timingScale, pressure);
  const timing = classifyTiming(input.meterPhase, window);
  return clamp(timing.quality, 0, 1);
}

export function mapInputToShotArc(input: ShotInput, context: ShotEvaluationContext): ShotArcParams {
  const preset = DIFFICULTY_PRESETS[context.difficulty];
  const pressure = context.pressureEnabled ? context.pressure : 0;
  const window = computeTimingWindowBase(TIMING_TUNING, preset.timingScale, pressure);
  const timing = classifyTiming(input.meterPhase, window);
  const timingWindow = window.green;
  const timingQuality = context.timingMeter ? timing.quality : 1;

  const assistFactor = context.assist ? 0.85 : 1;
  const pressurePenalty = context.pressureEnabled ? context.pressure : 0;
  const powerError = input.power - context.spot.targetPower;

  const targetX = context.hoopX + input.aim * context.spot.aimSpreadPx * assistFactor;
  const targetY = context.hoopY + powerError * 125;

  const flightTime = clamp(0.72 + context.spot.distanceScore * 0.09 - input.power * 0.12, 0.56, 1.1);
  const gravity = 1500;

  const velocityX = (targetX - context.spot.releaseX) / flightTime;
  const velocityY = (targetY - context.spot.releaseY - 0.5 * gravity * flightTime * flightTime) / flightTime;

  const difficultyPenalty = difficultyReleasePenalty(context.difficulty);
  const chance =
    0.84 -
    Math.abs(powerError) * 0.55 * difficultyPenalty -
    Math.abs(input.aim) * 0.22 * difficultyPenalty -
    (1 - timingQuality) * 0.35 -
    pressurePenalty * 0.18 +
    (context.assist ? 0.06 : 0);

  return {
    releaseX: context.spot.releaseX,
    releaseY: context.spot.releaseY,
    targetX,
    targetY,
    flightTime,
    gravity,
    velocityX,
    velocityY,
    timingWindow,
    timingQuality,
    timingBucket: timing.bucket,
    pressurePenalty,
    predictedMakeChance: clamp(chance, 0.05, 0.95)
  };
}

export function resolveShotOutcome(
  arc: ShotArcParams,
  context: ShotEvaluationContext,
  randA: number,
  randB: number
): ShotOutcome {
  const preset = DIFFICULTY_PRESETS[context.difficulty];
  const aimError = arc.targetX - context.hoopX;
  const verticalError = arc.targetY - context.hoopY;

  const variance =
    difficultyBaseVariance(context.difficulty) *
    (1 + arc.pressurePenalty * (context.pressureEnabled ? 0.55 : 0)) *
    (context.assist ? 0.86 : 1);

  const offsetX = aimError + (randA - 0.5) * variance * 2;
  const offsetY = verticalError + (randB - 0.5) * variance * 1.4;

  const distanceFromCenter = Math.hypot(offsetX, offsetY);
  const makeRadius = context.rimRadius * (0.62 + preset.rimForgiveness);
  const swishRadius = context.rimRadius * 0.3;

  const makeChanceBoost = clamp((arc.predictedMakeChance - 0.5) * 40, -10, 10);
  const adjustedDistance = distanceFromCenter - makeChanceBoost;
  const made = adjustedDistance <= makeRadius;

  let contact: ShotOutcome['contact'] = 'airball';
  let swish = false;
  let rimHit = false;
  let backboardHit = false;

  const hoopCrossX = (() => {
    const a = 0.5 * arc.gravity;
    const b = arc.velocityY;
    const c = arc.releaseY - context.hoopY;
    const disc = b * b - 4 * a * c;
    if (disc <= 0) return null;
    const root = Math.sqrt(disc);
    const t = (-b - root) / (2 * a);
    if (t <= 0 || t > arc.flightTime) return null;
    return arc.releaseX + arc.velocityX * t;
  })();

  if (made) {
    if (hoopCrossX !== null) {
      swish = Math.abs(hoopCrossX - context.hoopX) <= swishRadius;
    } else {
      swish = adjustedDistance <= swishRadius;
    }
    contact = swish ? 'swish' : 'rim';
    rimHit = !swish;
  } else {
    const rimBand = context.rimRadius * 1.15;
    if (adjustedDistance <= rimBand) {
      contact = 'rim';
      rimHit = true;
    } else {
      const boardDistance = Math.abs((context.backboardX - 10) - (context.hoopX + offsetX));
      if (boardDistance <= 26 && context.spot.distanceScore >= 2) {
        contact = 'backboard';
        backboardHit = true;
      }
    }
  }

  return {
    made,
    points: context.spot.basePoints,
    swish,
    rimHit,
    backboardHit,
    contact,
    finalX: context.hoopX + offsetX,
    finalY: context.hoopY + offsetY,
    scoreQuality: clamp(1 - adjustedDistance / (context.rimRadius * 1.35), 0, 1)
  };
}
