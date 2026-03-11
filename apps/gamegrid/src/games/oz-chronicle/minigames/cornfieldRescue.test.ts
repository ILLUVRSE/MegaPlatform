import { describe, expect, it } from 'vitest';
import { createCornfieldRescueState, stepCornfieldRescue } from './cornfieldRescue';

describe('scarecrow rescue success/fail conditions', () => {
  it('succeeds when enough untie actions are completed', () => {
    let state = createCornfieldRescueState();

    state = stepCornfieldRescue(state, 'untie', 300);
    state = stepCornfieldRescue(state, 'untie', 300);
    state = stepCornfieldRescue(state, 'untie', 300);
    state = stepCornfieldRescue(state, 'untie', 300);

    expect(state.done).toBe(true);
    expect(state.success).toBe(true);
  });

  it('fails when crow strikes reach max', () => {
    let state = createCornfieldRescueState();

    state = stepCornfieldRescue(state, 'crow-hit', 300);
    state = stepCornfieldRescue(state, 'crow-hit', 300);
    state = stepCornfieldRescue(state, 'crow-hit', 300);

    expect(state.done).toBe(true);
    expect(state.success).toBe(false);
  });
});
