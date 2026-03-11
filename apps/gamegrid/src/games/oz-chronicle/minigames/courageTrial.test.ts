import { describe, expect, it } from 'vitest';
import { courageTrialScore, createCourageTrialState, stepCourageTrial } from './courageTrial';

describe('courage trial scoring', () => {
  it('succeeds with steady control and scores positively', () => {
    let state = createCourageTrialState();

    for (let i = 0; i < 12; i += 1) {
      state = stepCourageTrial(state, 0.15, 0.12, 900);
      if (state.done) break;
    }

    expect(state.success).toBe(true);
    expect(courageTrialScore(state)).toBeGreaterThan(500);
  });
});
