import { describe, expect, it } from 'vitest';
import { computeShotPower, isBallInGoal, updateStamina } from '../src/game/systems/PhysicsSystem';
import { TUNING } from '../src/game/config/tuning';

describe('computeShotPower', () => {
  it('returns min power at zero charge', () => {
    expect(computeShotPower(0)).toBeCloseTo(TUNING.ball.shootMinPower, 6);
  });

  it('caps at max power', () => {
    expect(computeShotPower(999)).toBeCloseTo(TUNING.ball.shootMaxPower, 6);
  });

  it('increases with charge', () => {
    const low = computeShotPower(0.2);
    const high = computeShotPower(0.8);
    expect(high).toBeGreaterThan(low);
  });
});

describe('isBallInGoal', () => {
  const goal = { x: 0, y: 100, width: 30, height: 200 };

  it('detects when ball overlaps goal rect', () => {
    expect(isBallInGoal(20, 140, 10, goal)).toBe(true);
  });

  it('does not detect when clearly outside', () => {
    expect(isBallInGoal(100, 20, 8, goal)).toBe(false);
  });
});

describe('updateStamina', () => {
  it('drains while sprinting', () => {
    const next = updateStamina(50, true, 1);
    expect(next).toBeLessThan(50);
  });

  it('recovers while resting', () => {
    const next = updateStamina(50, false, 1);
    expect(next).toBeGreaterThan(50);
  });

  it('stays clamped', () => {
    expect(updateStamina(1, true, 99)).toBe(0);
    expect(updateStamina(99, false, 99)).toBe(TUNING.player.staminaMax);
  });
});
