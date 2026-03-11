import { describe, expect, it } from 'vitest';
import { nextHeatLevel } from './feedback';

describe('freethrow heat level', () => {
  it('builds heat with made shots', () => {
    expect(nextHeatLevel(0, true, false)).toBe(1);
    expect(nextHeatLevel(1, true, true)).toBe(3);
  });

  it('caps and decays heat correctly', () => {
    expect(nextHeatLevel(8, true, true)).toBe(8);
    expect(nextHeatLevel(7, false, false)).toBe(5);
    expect(nextHeatLevel(1, false, false)).toBe(0);
  });
});
