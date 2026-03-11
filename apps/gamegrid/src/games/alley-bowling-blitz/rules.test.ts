import { describe, expect, it } from 'vitest';
import { applyClassicRoll, applyTimedBlitzRoll, createClassicState, createTimedBlitzState, tickTimedBlitz } from './rules';

describe('alley bowling blitz rules', () => {
  it('advances frames and resets pins correctly', () => {
    let state = createClassicState();

    const first = applyClassicRoll(state, 10);
    state = first.state;
    expect(state.frame).toBe(2);
    expect(state.rollInFrame).toBe(1);
    expect(state.pinsStanding).toBe(10);

    const second = applyClassicRoll(state, 3);
    state = second.state;
    expect(state.frame).toBe(2);
    expect(state.rollInFrame).toBe(2);
    expect(state.pinsStanding).toBe(7);

    const third = applyClassicRoll(state, 7);
    state = third.state;
    expect(state.frame).toBe(3);
    expect(state.rollInFrame).toBe(1);
    expect(state.pinsStanding).toBe(10);
  });

  it('counts gutter ball as zero pins', () => {
    const state = createClassicState();
    const result = applyClassicRoll(state, 9, true);
    expect(result.outcome.pinsKnocked).toBe(0);
    expect(result.outcome.isGutter).toBe(true);
    expect(result.state.pinsStanding).toBe(10);
  });

  it('ends timed blitz at 60 seconds and applies policy bonuses', () => {
    let state = createTimedBlitzState(60_000);
    state = applyTimedBlitzRoll(state, 10).state;
    expect(state.score).toBeGreaterThanOrEqual(15);

    state = tickTimedBlitz(state, 60_000);
    expect(state.ended).toBe(true);

    const frozen = applyTimedBlitzRoll(state, 10).state;
    expect(frozen.score).toBe(state.score);
  });
});
