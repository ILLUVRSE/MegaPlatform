import { DEFAULT_SCORING, type GoalRect, type ScoringConfig, type ShotInput, type ShotModelContext, type ShotPlan, type ShotResolution } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function varianceForDifficulty(difficulty: ShotModelContext['difficulty']): number {
  if (difficulty === 'easy') return 14;
  if (difficulty === 'hard') return 31;
  return 22;
}

function sensitivityVarianceFactor(sensitivity: ShotModelContext['sensitivity']): number {
  if (sensitivity === 'low') return 0.88;
  if (sensitivity === 'high') return 1.14;
  return 1;
}

export function mapInputToShotPlan(
  input: ShotInput,
  context: ShotModelContext,
  randA: number,
  randB: number
): ShotPlan {
  const safeX = clamp(input.targetXNorm, 0, 1);
  const safeY = clamp(input.targetYNorm, 0, 1);
  const power = clamp(input.power, 0.05, 1);

  const innerLeft = context.goal.left + 20;
  const innerRight = context.goal.right - 20;
  const innerTop = context.goal.top + 10;
  const innerBottom = context.goal.bottom - 10;

  const aimX = lerp(innerLeft, innerRight, safeX);
  const aimY = lerp(innerBottom, innerTop, safeY);

  const spin = context.spinEnabled ? clamp(input.spin + input.curvatureHint * 0.5, -1, 1) : 0;
  const curve = spin * 95;

  const pressurePenalty = clamp(input.pressure, 0, 1) * 0.8;
  const assistFactor = context.assistEnabled ? 0.75 : 1;
  const variance = varianceForDifficulty(context.difficulty) * sensitivityVarianceFactor(context.sensitivity) * assistFactor;

  const powerDriftY = (0.62 - power) * 46;
  const varianceX = (randA - 0.5) * variance * (1 + pressurePenalty);
  const varianceY = (randB - 0.5) * variance * 0.75 * (1 + pressurePenalty) + powerDriftY;

  const finalX = aimX + varianceX;
  const finalY = aimY + varianceY;

  const perfectWindow = Math.abs(varianceX) < 6 && Math.abs(varianceY) < 6 && Math.abs(power - 0.7) < 0.1;
  const cornerTarget =
    (finalX < context.goal.left + 80 || finalX > context.goal.right - 80) &&
    (finalY < context.goal.top + 60 || finalY > context.goal.bottom - 60);

  const quality = clamp(1 - (Math.abs(varianceX) + Math.abs(varianceY)) / 140, 0, 1);

  return {
    aimX,
    aimY,
    power,
    spin,
    curve,
    varianceX,
    varianceY,
    perfectWindow,
    cornerTarget,
    finalX,
    finalY,
    quality
  };
}

export function classifyZone(goal: GoalRect, x: number): ShotResolution['zone'] {
  const width = goal.right - goal.left;
  const leftEdge = goal.left + width / 3;
  const rightEdge = goal.right - width / 3;
  if (x < leftEdge) return 'left';
  if (x > rightEdge) return 'right';
  return 'center';
}

function isPostHit(goal: GoalRect, x: number, y: number): boolean {
  const nearVertical = y >= goal.top - 8 && y <= goal.bottom + 8;
  const nearPost = Math.abs(x - goal.left) <= 10 || Math.abs(x - goal.right) <= 10;
  const nearCrossbar = Math.abs(y - goal.crossbarY) <= 8 && x >= goal.left - 6 && x <= goal.right + 6;
  return (nearVertical && nearPost) || nearCrossbar;
}

export function resolveShotResult(
  plan: ShotPlan,
  goal: GoalRect,
  keeperSaved: boolean,
  scoring: ScoringConfig = DEFAULT_SCORING
): ShotResolution {
  const zone = classifyZone(goal, plan.finalX);
  const tooWide = plan.finalX < goal.left || plan.finalX > goal.right;
  const tooHigh = plan.finalY < goal.top;

  if (isPostHit(goal, plan.finalX, plan.finalY)) {
    return {
      result: 'post',
      finalX: plan.finalX,
      finalY: plan.finalY,
      keeperSaved: false,
      cornerGoal: false,
      perfectShot: plan.perfectWindow,
      pointsAwarded: 0,
      zone
    };
  }

  if (tooWide) {
    return {
      result: 'wide',
      finalX: plan.finalX,
      finalY: plan.finalY,
      keeperSaved: false,
      cornerGoal: false,
      perfectShot: false,
      pointsAwarded: 0,
      zone
    };
  }

  if (tooHigh) {
    return {
      result: 'high',
      finalX: plan.finalX,
      finalY: plan.finalY,
      keeperSaved: false,
      cornerGoal: false,
      perfectShot: false,
      pointsAwarded: 0,
      zone
    };
  }

  if (keeperSaved) {
    return {
      result: 'saved',
      finalX: plan.finalX,
      finalY: plan.finalY,
      keeperSaved: true,
      cornerGoal: false,
      perfectShot: false,
      pointsAwarded: 0,
      zone
    };
  }

  let points = scoring.goalBase;
  if (plan.cornerTarget) points += scoring.cornerBonus;
  if (plan.perfectWindow) points += scoring.perfectBonus;

  return {
    result: 'goal',
    finalX: plan.finalX,
    finalY: plan.finalY,
    keeperSaved: false,
    cornerGoal: plan.cornerTarget,
    perfectShot: plan.perfectWindow,
    pointsAwarded: points,
    zone
  };
}
