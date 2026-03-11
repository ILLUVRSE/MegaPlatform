import { describe, expect, it } from 'vitest';
import { applyShotToMatch, createInitialMatchState, resolveLadderDifficulty } from './rules';
import type { PenaltySetup } from './types';

function setup(mode: PenaltySetup['mode']): PenaltySetup {
  return {
    mode,
    difficulty: 'medium',
    controls: 'swipe',
    options: {
      spinEnabled: false,
      assistEnabled: true,
      sensitivity: 'medium'
    }
  };
}

describe('penalty kick showdown rules', () => {
  it('classic 5-shots ends after 5 and score counts goals', () => {
    let state = createInitialMatchState(setup('classic_5'));

    for (let i = 0; i < 4; i += 1) {
      state = applyShotToMatch(state, {
        result: 'goal',
        finalX: 600,
        finalY: 200,
        keeperSaved: false,
        cornerGoal: false,
        perfectShot: false,
        pointsAwarded: 100,
        zone: 'center'
      });
    }

    expect(state.ended).toBe(false);

    state = applyShotToMatch(state, {
      result: 'saved',
      finalX: 640,
      finalY: 220,
      keeperSaved: true,
      cornerGoal: false,
      perfectShot: false,
      pointsAwarded: 0,
      zone: 'center'
    });

    expect(state.shotsTaken).toBe(5);
    expect(state.ended).toBe(true);
    expect(state.score).toBe(400);
    expect(state.stats.goals).toBe(4);
  });

  it('sudden death ends on first miss/save and tracks streak', () => {
    let state = createInitialMatchState(setup('sudden_death'));

    state = applyShotToMatch(state, {
      result: 'goal',
      finalX: 540,
      finalY: 230,
      keeperSaved: false,
      cornerGoal: false,
      perfectShot: false,
      pointsAwarded: 100,
      zone: 'left'
    });

    state = applyShotToMatch(state, {
      result: 'goal',
      finalX: 760,
      finalY: 200,
      keeperSaved: false,
      cornerGoal: false,
      perfectShot: false,
      pointsAwarded: 100,
      zone: 'right'
    });

    expect(state.ended).toBe(false);
    expect(state.streak).toBe(2);

    state = applyShotToMatch(state, {
      result: 'saved',
      finalX: 640,
      finalY: 220,
      keeperSaved: true,
      cornerGoal: false,
      perfectShot: false,
      pointsAwarded: 0,
      zone: 'center'
    });

    expect(state.ended).toBe(true);
    expect(state.bestStreak).toBe(2);
    expect(state.stats.savesAgainst).toBe(1);
  });

  it('ladder difficulty escalates across rounds', () => {
    let state = createInitialMatchState(setup('pressure_ladder'));
    expect(state.effectiveDifficulty).toBe('easy');

    for (let i = 0; i < 3; i += 1) {
      state = applyShotToMatch(state, {
        result: 'goal',
        finalX: 620,
        finalY: 210,
        keeperSaved: false,
        cornerGoal: false,
        perfectShot: false,
        pointsAwarded: 100,
        zone: 'center'
      });
    }

    expect(state.effectiveDifficulty).toBe('medium');

    for (let i = 0; i < 4; i += 1) {
      state = applyShotToMatch(state, {
        result: 'goal',
        finalX: 620,
        finalY: 210,
        keeperSaved: false,
        cornerGoal: false,
        perfectShot: false,
        pointsAwarded: 100,
        zone: 'center'
      });
    }

    expect(state.effectiveDifficulty).toBe('hard');
    expect(resolveLadderDifficulty(10)).toBe('hard');
  });
});
