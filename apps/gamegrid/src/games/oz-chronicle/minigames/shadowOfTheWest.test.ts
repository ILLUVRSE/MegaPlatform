import { describe, expect, it } from 'vitest';
import {
  buildShadowPattern,
  createShadowOfTheWestState,
  DEFAULT_SHADOW_OF_THE_WEST_CONFIG,
  shadowOfTheWestScore,
  stepShadowOfTheWest
} from './shadowOfTheWest';

describe('shadow of the west minigame', () => {
  it('builds deterministic sweep and cover patterns by seed and difficulty', () => {
    const a = buildShadowPattern(1701, 1);
    const b = buildShadowPattern(1701, 1);
    const c = buildShadowPattern(1701, 1.12);

    expect(Array.from(a.sweepMasks)).toEqual(Array.from(b.sweepMasks));
    expect(Array.from(a.coverMasks)).toEqual(Array.from(b.coverMasks));
    expect(Array.from(a.tokenLanes)).toEqual(Array.from(b.tokenLanes));
    expect(Array.from(a.sweepMasks)).not.toEqual(Array.from(c.sweepMasks));
  });

  it('supports win and fail scoring thresholds', () => {
    const easyConfig = {
      ...DEFAULT_SHADOW_OF_THE_WEST_CONFIG,
      durationMs: 11000,
      patternLength: 22,
      baseExposurePerSecond: 0.012,
      sweepExposurePerEvent: 0.05,
      successExposureThreshold: 0.92,
      sweepChance: 0.2,
      coverChance: 0.62
    };

    let winState = createShadowOfTheWestState(1900, 0.92, {
      scarecrowReveal: true,
      tinWard: true,
      lionSteadyBreath: true
    }, easyConfig);

    for (let i = 0; i < 30; i += 1) {
      winState = stepShadowOfTheWest(
        winState,
        {
          laneShift: i % 5 === 0 ? 1 : 0,
          hide: i % 2 === 0,
          triggerTinWard: i === 4,
          triggerLionSteady: i === 8
        },
        460,
        { scarecrowReveal: true, tinWard: true, lionSteadyBreath: true },
        easyConfig
      );
      if (winState.done) break;
    }

    let failState = createShadowOfTheWestState(1911, 1.12, {
      scarecrowReveal: false,
      tinWard: false,
      lionSteadyBreath: false
    });
    for (let i = 0; i < 12; i += 1) {
      failState = stepShadowOfTheWest(
        failState,
        { laneShift: 0, hide: false, triggerTinWard: false, triggerLionSteady: false },
        780,
        { scarecrowReveal: false, tinWard: false, lionSteadyBreath: false }
      );
      if (failState.done) break;
    }

    expect(winState.success).toBe(true);
    expect(failState.success).toBe(false);
    expect(shadowOfTheWestScore(winState, easyConfig)).toBeGreaterThan(shadowOfTheWestScore(failState));
  });

  it('triggers companion assists once and clamps exposure', () => {
    let state = createShadowOfTheWestState(2001, 1, {
      scarecrowReveal: true,
      tinWard: true,
      lionSteadyBreath: true
    });

    expect(state.revealRemainingMs).toBeGreaterThan(0);
    expect(state.revealedSafeLane).not.toBeNull();

    state = stepShadowOfTheWest(
      state,
      { laneShift: 0, hide: true, triggerTinWard: true, triggerLionSteady: true },
      200,
      { scarecrowReveal: true, tinWard: true, lionSteadyBreath: true }
    );

    const tinAfterFirst = state.tinWardRemainingMs;
    const lionAfterFirst = state.lionSteadyRemainingMs;
    expect(state.tinWardUsed).toBe(true);
    expect(state.lionSteadyUsed).toBe(true);

    state = stepShadowOfTheWest(
      state,
      { laneShift: 0, hide: true, triggerTinWard: true, triggerLionSteady: true },
      200,
      { scarecrowReveal: true, tinWard: true, lionSteadyBreath: true }
    );

    expect(state.tinWardRemainingMs).toBeLessThan(tinAfterFirst);
    expect(state.lionSteadyRemainingMs).toBeLessThan(lionAfterFirst);
    expect(state.exposure).toBeGreaterThanOrEqual(0);
    expect(state.exposure).toBeLessThanOrEqual(1);
  });
});
