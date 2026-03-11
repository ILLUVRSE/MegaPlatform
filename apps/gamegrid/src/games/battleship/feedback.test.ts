import { describe, expect, it } from 'vitest';
import { nextHitStreak, pushImpact, tickImpacts, type ImpactPulse } from './feedback';

describe('battleship feedback', () => {
  it('increments and resets hit streak', () => {
    expect(nextHitStreak(0, true)).toBe(1);
    expect(nextHitStreak(2, true)).toBe(3);
    expect(nextHitStreak(4, false)).toBe(0);
  });

  it('caps impact queue size', () => {
    const impacts: ImpactPulse[] = [];
    for (let i = 0; i < 30; i += 1) {
      pushImpact(impacts, { side: 'enemy', row: 0, col: i % 8, hit: i % 2 === 0, lifeMs: 500 }, 24);
    }
    expect(impacts).toHaveLength(24);
  });

  it('expires old impact pulses over time', () => {
    const impacts: ImpactPulse[] = [
      { side: 'enemy', row: 0, col: 0, hit: true, lifeMs: 100 },
      { side: 'enemy', row: 0, col: 1, hit: false, lifeMs: 500 }
    ];
    tickImpacts(impacts, 150);
    expect(impacts).toHaveLength(1);
    expect(impacts[0].col).toBe(1);
    expect(impacts[0].lifeMs).toBe(350);
  });
});
