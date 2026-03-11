import { describe, expect, it } from 'vitest';
import { createOilAndJointsState, oilAndJointsScore, stepOilAndJoints } from './oilAndJoints';

describe('oil and joints scoring', () => {
  it('rewards correct valve sequence with high score', () => {
    let state = createOilAndJointsState();
    for (let i = 0; i < 10; i += 1) {
      state = stepOilAndJoints(state, i % 4, 280);
      if (state.done) break;
    }

    expect(state.success).toBe(true);
    expect(oilAndJointsScore(state)).toBeGreaterThan(700);
  });
});
