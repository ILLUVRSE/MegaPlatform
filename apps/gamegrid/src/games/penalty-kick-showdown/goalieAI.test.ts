import { describe, expect, it } from 'vitest';
import { canGoalieSave, createGoalieDivePlan } from './goalieAI';
import type { GoalRect } from './types';

const goal: GoalRect = {
  left: 360,
  right: 920,
  top: 132,
  bottom: 330,
  crossbarY: 132
};

describe('penalty goalie AI', () => {
  it('cannot save shots outside reach bounds', () => {
    const plan = createGoalieDivePlan(
      {
        difficulty: 'medium',
        readAimX: 640,
        readAimY: 220,
        shotPower: 0.7,
        reactionJitter: 0,
        randomness: 0.8
      },
      goal
    );

    const saveable = canGoalieSave({
      shotX: 650,
      shotY: 220,
      goal,
      plan,
      keeperXAtIntercept: 640
    });

    const unsaveable = canGoalieSave({
      shotX: 640 + plan.reachPx + 24,
      shotY: 220,
      goal,
      plan,
      keeperXAtIntercept: 640
    });

    expect(saveable).toBe(true);
    expect(unsaveable).toBe(false);
  });

  it('hard difficulty reacts faster than easy', () => {
    const easy = createGoalieDivePlan(
      {
        difficulty: 'easy',
        readAimX: 640,
        readAimY: 210,
        shotPower: 0.7,
        reactionJitter: 0,
        randomness: 0.7
      },
      goal
    );

    const hard = createGoalieDivePlan(
      {
        difficulty: 'hard',
        readAimX: 640,
        readAimY: 210,
        shotPower: 0.7,
        reactionJitter: 0,
        randomness: 0.7
      },
      goal
    );

    expect(hard.reactionDelayMs).toBeLessThan(easy.reactionDelayMs);
    expect(hard.reachPx).toBeGreaterThan(easy.reachPx);
  });
});
