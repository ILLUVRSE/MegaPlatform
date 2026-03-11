import { describe, expect, it } from 'vitest';
import { comboMultiplier, consonantPayout, nextCombo } from './scoring';

describe('wheel scoring', () => {
  it('caps combo multiplier growth', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(2)).toBeCloseTo(1.3);
    expect(comboMultiplier(20)).toBeCloseTo(1.75);
  });

  it('computes consonant payout with combo bonus', () => {
    expect(consonantPayout(400, 2, 0)).toBe(800);
    expect(consonantPayout(400, 2, 3)).toBe(1160);
  });

  it('resets combo after incorrect guess', () => {
    expect(nextCombo(0, true)).toBe(1);
    expect(nextCombo(3, true)).toBe(4);
    expect(nextCombo(3, false)).toBe(0);
  });
});
