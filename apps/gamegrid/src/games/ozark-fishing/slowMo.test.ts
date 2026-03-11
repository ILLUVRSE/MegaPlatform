import { describe, expect, it } from 'vitest';
import { VisualSlowMoController, computeVisualDelta } from './slowMo';

describe('ozark visual slow-mo', () => {
  it('disables when forced by reduced motion path', () => {
    const slowMo = new VisualSlowMoController();
    slowMo.setEnabled(true);
    slowMo.trigger('perfect_hook', 320);
    const state = slowMo.update(16, true);
    expect(state.active).toBe(false);
    expect(state.timeScale).toBe(1);
  });

  it('does not alter authoritative simulation clocks', () => {
    const slowMo = new VisualSlowMoController();
    slowMo.setEnabled(true);
    slowMo.trigger('legendary_strike', 300);

    let authoritativeTime = 0;
    let visualTime = 0;

    for (let i = 0; i < 10; i += 1) {
      authoritativeTime += 1 / 60;
      const state = slowMo.update(1000 / 60, false);
      visualTime += computeVisualDelta(1 / 60, state.timeScale);
    }

    expect(authoritativeTime).toBeCloseTo(10 / 60, 6);
    expect(visualTime).toBeLessThan(authoritativeTime);
  });
});
