import { describe, expect, it } from 'vitest';
import { createCycloneState, cycloneScore, stepCyclone } from './cycloneEscape';

describe('cyclone balance scoring logic', () => {
  it('awards higher score for successful stable run', () => {
    let state = createCycloneState();
    for (let i = 0; i < 14; i += 1) {
      state = stepCyclone(state, 0.03, 0.1, 1000);
    }

    expect(state.done).toBe(true);
    expect(state.success).toBe(true);
    expect(cycloneScore(state)).toBeGreaterThan(700);
  });

  it('ends run on severe imbalance', () => {
    let state = createCycloneState();
    for (let i = 0; i < 8; i += 1) {
      state = stepCyclone(state, 0, 1, 400);
      if (state.done) break;
    }

    expect(state.done).toBe(true);
    expect(state.success).toBe(false);
    expect(cycloneScore(state)).toBeLessThan(500);
  });
});
