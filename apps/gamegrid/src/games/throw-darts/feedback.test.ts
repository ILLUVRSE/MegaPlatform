import { describe, expect, it } from 'vitest';
import { nextHotStreak, throwFeedbackMessage } from './feedback';
import type { DartHit } from './types';

describe('throw darts feedback', () => {
  it('updates hot streak and resets on bust/miss', () => {
    const triple20: DartHit = { ring: 'triple', number: 20, score: 60, multiplier: 3, isDouble: false, isBull: false, radial: 0.6, theta: 0 };
    const miss: DartHit = { ring: 'miss', number: null, score: 0, multiplier: 0, isDouble: false, isBull: false, radial: 1.2, theta: 0 };

    expect(nextHotStreak(0, triple20, false)).toBe(1);
    expect(nextHotStreak(1, triple20, false)).toBe(2);
    expect(nextHotStreak(2, miss, false)).toBe(0);
    expect(nextHotStreak(2, triple20, true)).toBe(0);
  });

  it('returns expected user feedback copy', () => {
    const bull: DartHit = { ring: 'inner_bull', number: null, score: 50, multiplier: 0, isDouble: false, isBull: true, radial: 0, theta: 0 };
    const miss: DartHit = { ring: 'miss', number: null, score: 0, multiplier: 0, isDouble: false, isBull: false, radial: 1, theta: 0 };

    expect(throwFeedbackMessage(bull, false)).toContain('Bullseye');
    expect(throwFeedbackMessage(miss, false)).toContain('Missed');
    expect(throwFeedbackMessage(bull, true)).toContain('Bust');
  });
});
