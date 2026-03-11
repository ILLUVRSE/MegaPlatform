import { describe, expect, it } from 'vitest';
import { applyGoal, createInitialMatchState, tickMatchTimer } from './rules';

describe('pixelpuck rules', () => {
  it('first to 7 ends match and declares winner', () => {
    let state = createInitialMatchState('first_to_7');

    for (let i = 0; i < 7; i += 1) {
      state = applyGoal(state, 'player');
    }

    expect(state.ended).toBe(true);
    expect(state.winner).toBe('player');
    expect(state.scores.player).toBe(7);
  });

  it('timed mode resolves tie with sudden death policy', () => {
    let state = createInitialMatchState('timed');
    state = applyGoal(state, 'player');
    state = applyGoal(state, 'ai');

    state = tickMatchTimer(state, 90_000);
    expect(state.suddenDeath).toBe(true);
    expect(state.ended).toBe(false);

    state = applyGoal(state, 'ai');
    expect(state.ended).toBe(true);
    expect(state.winner).toBe('ai');
  });
});
