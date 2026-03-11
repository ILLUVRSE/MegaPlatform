import { describe, expect, it } from 'vitest';
import { transitionsEnabled } from './motionPolicy';

describe('oz chronicle motion policy', () => {
  it('disables transitions when reduced motion is enabled globally or locally', () => {
    expect(transitionsEnabled(false, false)).toBe(true);
    expect(transitionsEnabled(true, false)).toBe(false);
    expect(transitionsEnabled(false, true)).toBe(false);
  });
});
