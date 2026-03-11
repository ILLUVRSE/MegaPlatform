import { describe, expect, it } from 'vitest';
import { mapSwipeToSpin, spinHintFromValue } from './spin';

describe('table tennis spin mapping', () => {
  it('maps upward component to topspin and downward to backspin', () => {
    const top = mapSwipeToSpin(0.2, 0.8, false, false);
    const back = mapSwipeToSpin(-0.2, -0.8, false, false);

    expect(top).toBeGreaterThan(0);
    expect(back).toBeLessThan(0);
    expect(spinHintFromValue(top)).toBe('top');
    expect(spinHintFromValue(back)).toBe('back');
  });
});
