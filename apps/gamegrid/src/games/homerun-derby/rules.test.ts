import { describe, expect, it } from 'vitest';
import { applyPitchOutcome, createMatchState, resolveMatchEnd, tickMatch } from './rules';
import type { BatterSwing, OutcomeContext } from './types';

function makeSwing(result: BatterSwing['flight']['result'], distanceFt: number, perfectPerfect = false): BatterSwing {
  return {
    contact: {
      timing: perfectPerfect ? 'perfect' : 'early',
      quality: perfectPerfect ? 'perfect' : 'solid',
      grade: perfectPerfect ? 'Perfect' : 'Early',
      exitVelocityMph: perfectPerfect ? 109 : 87,
      launchAngleDeg: perfectPerfect ? 28 : 22,
      sprayLane: 0,
      perfectPerfect,
      strike: result === 'strike',
      aimError: 0.1,
      timingDeltaMs: 0
    },
    flight: {
      result,
      distanceFt,
      hangTimeMs: 2100,
      landingX: 640,
      peakY: 180,
      isHomeRun: result === 'home_run',
      sprayAngleDeg: 0
    }
  };
}

function applyPlayerSwing(state: ReturnType<typeof createMatchState>, swing: BatterSwing) {
  const outcome: OutcomeContext = {
    role: 'player',
    swing
  };
  return applyPitchOutcome(state, outcome);
}

describe('homerun derby rules', () => {
  it('classic mode ends exactly at 10 pitches and reports stats', () => {
    let state = createMatchState('classic_10');
    for (let i = 0; i < 10; i += 1) {
      state = applyPlayerSwing(state, makeSwing('home_run', 372, i % 2 === 0));
    }

    expect(state.state.kind).toBe('classic_10');
    if (state.state.kind !== 'classic_10') return;
    expect(state.state.pitchesThrown).toBe(10);
    expect(state.state.pitchesRemaining).toBe(0);
    expect(state.state.ended).toBe(true);
    expect(state.stats.hrCount).toBe(10);
    expect(state.stats.bestDistance).toBe(372);
  });

  it('timed mode ends at 60 seconds and keeps final score', () => {
    let state = createMatchState('timed_60');
    state = applyPlayerSwing(state, makeSwing('home_run', 401, true));

    state = tickMatch(state, 60000);
    expect(state.state.kind).toBe('timed_60');
    if (state.state.kind !== 'timed_60') return;
    expect(state.state.timeRemainingMs).toBe(0);
    expect(state.state.ended).toBe(true);

    const frozenScore = state.stats.score;
    const postEnd = applyPlayerSwing(state, makeSwing('home_run', 390, true));
    expect(postEnd.stats.score).toBe(frozenScore);

    const summary = resolveMatchEnd(state, 60000);
    expect(summary.durationMs).toBe(60000);
    expect(summary.score).toBe(frozenScore);
  });

  it('streak multiplier increments, caps at x3, then resets on non-home run', () => {
    let state = createMatchState('classic_10');

    state = applyPlayerSwing(state, makeSwing('home_run', 360));
    expect(state.stats.multiplier).toBe(1);
    state = applyPlayerSwing(state, makeSwing('home_run', 360));
    expect(state.stats.multiplier).toBe(2);
    state = applyPlayerSwing(state, makeSwing('home_run', 360));
    expect(state.stats.multiplier).toBe(3);
    state = applyPlayerSwing(state, makeSwing('home_run', 360));
    expect(state.stats.multiplier).toBe(3);

    state = applyPlayerSwing(state, makeSwing('fly_out', 240));
    expect(state.stats.streak).toBe(0);
    expect(state.stats.multiplier).toBe(1);
  });
});
