import { describe, expect, it } from 'vitest';
import {
  applyHorseAnswerShot,
  applyHorseSetChallengeShot,
  applyThreePointShot,
  applyTimedShot,
  createInitialModeState,
  getThreePointSpot,
  tickTimedMode
} from './rules';

describe('freethrow frenzy rules', () => {
  it('timed mode ends at 60s and updates score/streak', () => {
    let state = createInitialModeState('timed_60');
    expect(state.kind).toBe('timed_60');
    if (state.kind !== 'timed_60') return;

    state = applyTimedShot(state, { made: true, points: 1 });
    state = applyTimedShot(state, { made: true, points: 3 });

    expect(state.score).toBe(7);
    expect(state.streak).toBe(2);

    state = tickTimedMode(state, 59_999);
    expect(state.ended).toBe(false);

    state = tickTimedMode(state, 1);
    expect(state.ended).toBe(true);
    expect(state.timeRemainingMs).toBe(0);
  });

  it('streak multiplier increments, caps, and resets on miss', () => {
    let state = createInitialModeState('timed_60');
    expect(state.kind).toBe('timed_60');
    if (state.kind !== 'timed_60') return;

    state = applyTimedShot(state, { made: true, points: 1 });
    expect(state.multiplier).toBe(1);

    state = applyTimedShot(state, { made: true, points: 1 });
    expect(state.multiplier).toBe(2);

    state = applyTimedShot(state, { made: true, points: 1 });
    state = applyTimedShot(state, { made: true, points: 1 });
    expect(state.multiplier).toBe(3);

    state = applyTimedShot(state, { made: false, points: 1 });
    expect(state.streak).toBe(0);
    expect(state.multiplier).toBe(1);
  });

  it('3pt contest progresses through spots and total balls correctly', () => {
    let state = createInitialModeState('three_point_contest');
    expect(state.kind).toBe('three_point_contest');
    if (state.kind !== 'three_point_contest') return;

    expect(getThreePointSpot(state)).toBe('left_corner');

    for (let i = 0; i < 5; i += 1) {
      state = applyThreePointShot(state, i % 2 === 0);
    }

    expect(state.currentSpotIndex).toBe(1);
    expect(state.ballInRack).toBe(0);
    expect(state.totalBallsShot).toBe(5);
    expect(getThreePointSpot(state)).toBe('left_wing');

    for (let i = 0; i < 20; i += 1) {
      state = applyThreePointShot(state, true);
    }

    expect(state.totalBallsShot).toBe(25);
    expect(state.ended).toBe(true);
  });

  it('HORSE adds letters on miss and ends on full word', () => {
    let state = createInitialModeState('horse');
    expect(state.kind).toBe('horse');
    if (state.kind !== 'horse') return;

    state = applyHorseSetChallengeShot(state, 'three_point', true);
    expect(state.phase).toBe('answer');

    for (let i = 0; i < 5; i += 1) {
      state = applyHorseAnswerShot(state, false);
      if (i < 4) {
        state = applyHorseSetChallengeShot(state, 'three_point', true);
      }
    }

    expect(state.ended).toBe(true);
    expect(state.playerLetters[1]).toBe(5);
    expect(state.winner).toBe(0);
  });
});

