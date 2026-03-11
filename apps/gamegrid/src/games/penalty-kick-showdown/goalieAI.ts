import type { GoalRect, GoalieDecisionContext, GoalieDivePlan, GoalieSaveContext } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function profileForDifficulty(difficulty: GoalieDecisionContext['difficulty']) {
  if (difficulty === 'easy') {
    return {
      reactionDelayMs: 280,
      diveDurationMs: 420,
      reachPx: 84,
      readErrorPx: 70,
      wrongDirectionChance: 0.28
    };
  }
  if (difficulty === 'hard') {
    return {
      reactionDelayMs: 140,
      diveDurationMs: 280,
      reachPx: 132,
      readErrorPx: 32,
      wrongDirectionChance: 0.08
    };
  }
  return {
    reactionDelayMs: 200,
    diveDurationMs: 340,
    reachPx: 110,
    readErrorPx: 48,
    wrongDirectionChance: 0.16
  };
}

export function createGoalieDivePlan(context: GoalieDecisionContext, goal: GoalRect): GoalieDivePlan {
  const profile = profileForDifficulty(context.difficulty);
  const centerX = (goal.left + goal.right) * 0.5;
  const clampedReadX = clamp(context.readAimX, goal.left, goal.right);

  const jitterScale = 1 + clamp(context.reactionJitter, 0, 1) * 0.4;
  const readNoise = (context.randomness - 0.5) * 2 * profile.readErrorPx * jitterScale;

  let targetX = clampedReadX + readNoise;
  const shouldDiveWrongWay = context.randomness < profile.wrongDirectionChance;
  if (shouldDiveWrongWay) {
    const mirrored = centerX - (targetX - centerX);
    targetX = mirrored;
  }

  const powerAdjustment = (context.shotPower - 0.55) * 18;
  targetX = clamp(targetX + powerAdjustment, goal.left + 12, goal.right - 12);

  return {
    targetX,
    reactionDelayMs: profile.reactionDelayMs,
    diveDurationMs: profile.diveDurationMs,
    reachPx: profile.reachPx
  };
}

export function canGoalieSave(context: GoalieSaveContext): boolean {
  if (context.shotX < context.goal.left || context.shotX > context.goal.right) return false;
  if (context.shotY < context.goal.top || context.shotY > context.goal.bottom) return false;

  const horizontalDelta = Math.abs(context.shotX - context.keeperXAtIntercept);
  const heightPenalty = context.shotY < context.goal.top + 36 ? 10 : 0;
  return horizontalDelta <= Math.max(0, context.plan.reachPx - heightPenalty);
}
