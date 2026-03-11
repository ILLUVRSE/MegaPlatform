import { describe, expect, it } from 'vitest';
import { mapInputToShotPlan, resolveShotResult } from './shotModel';
import type { GoalRect, ShotInput } from './types';

const goal: GoalRect = {
  left: 360,
  right: 920,
  top: 132,
  bottom: 330,
  crossbarY: 132
};

describe('penalty shot model', () => {
  it('maps swipe vector input to consistent aim/power params', () => {
    const input: ShotInput = {
      source: 'swipe',
      targetXNorm: 0.83,
      targetYNorm: 0.74,
      power: 0.78,
      spin: 0.22,
      curvatureHint: 0.1,
      pressure: 0.3
    };

    const context = {
      goal,
      difficulty: 'medium' as const,
      assistEnabled: false,
      sensitivity: 'medium' as const,
      spinEnabled: true
    };

    const a = mapInputToShotPlan(input, context, 0.4, 0.61);
    const b = mapInputToShotPlan(input, context, 0.4, 0.61);

    expect(a).toEqual(b);
    expect(a.power).toBeCloseTo(0.78, 3);
    expect(a.aimX).toBeGreaterThan(700);
    expect(a.aimY).toBeLessThan(250);
  });

  it('applies corner and perfect bonuses to scoring', () => {
    const input: ShotInput = {
      source: 'tap_target',
      targetXNorm: 0.05,
      targetYNorm: 0.95,
      power: 0.7,
      spin: 0,
      curvatureHint: 0,
      pressure: 0
    };

    const plan = mapInputToShotPlan(
      input,
      {
        goal,
        difficulty: 'easy',
        assistEnabled: true,
        sensitivity: 'low',
        spinEnabled: false
      },
      0.5,
      0.5
    );

    const result = resolveShotResult(plan, goal, false);
    expect(result.result).toBe('goal');
    expect(result.cornerGoal).toBe(true);
    expect(result.perfectShot).toBe(true);
    expect(result.pointsAwarded).toBe(170);
  });
});
