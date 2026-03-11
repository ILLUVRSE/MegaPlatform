import { describe, expect, it } from 'vitest';
import { createMatchState, registerGoal, tickMatchClock } from './rules';

describe('foosball rules', () => {
  it('triggers winner in first-to-5 mode', () => {
    let state = createMatchState('first_to_5', 90);
    for (let i = 0; i < 5; i += 1) {
      state = registerGoal(state, 'player');
    }

    expect(state.ended).toBe(true);
    expect(state.winner).toBe('player');
    expect(state.score).toEqual([5, 0]);
  });

  it('timed mode enters sudden death on tie and resolves on next goal', () => {
    let state = createMatchState('timed', 90);
    state = registerGoal(state, 'player');
    state = registerGoal(state, 'ai');

    state = tickMatchClock(state, 90000);
    expect(state.suddenDeath).toBe(true);
    expect(state.ended).toBe(false);

    state = registerGoal(state, 'ai');
    expect(state.ended).toBe(true);
    expect(state.winner).toBe('ai');
    expect(state.score).toEqual([1, 2]);
  });
});
