import { describe, expect, it } from 'vitest';
import {
  buildPoppyHazards,
  createPoppyRescueState,
  poppyRescueScore,
  stepPoppyRescue
} from './poppyRescue';

describe('poppy drift rescue minigame', () => {
  it('builds deterministic cloud hazards from seed', () => {
    const a = buildPoppyHazards(1900);
    const b = buildPoppyHazards(1900);
    expect(Array.from(a.lightCloudMasks)).toEqual(Array.from(b.lightCloudMasks));
    expect(Array.from(a.heavyCloudMasks)).toEqual(Array.from(b.heavyCloudMasks));
  });

  it('resolves win/fail according to progress and sleep pressure', () => {
    const easyConfig = {
      durationMs: 12500,
      laneCount: 3,
      patternLength: 30,
      targetProgress: 60,
      baseProgressPerSecond: 13,
      sleepGainPerCloud: 0,
      sleepRecoveryPerSecond: 0.06,
      heavyCloudChance: 0,
      slowFactor: 0.35,
      lionSleepPenalty: 0.01
    };
    const assist = { tinAndScarecrowRescueBoost: 4, lionCourageResist: 0.35 };
    let winState = createPoppyRescueState(415, easyConfig);
    for (let i = 0; i < 20; i += 1) {
      winState = stepPoppyRescue(winState, { laneShift: i % 2 === 0 ? 1 : -1, steeringHold: true }, 700, assist, easyConfig);
      if (winState.done) break;
    }

    let failState = createPoppyRescueState(333);
    for (let i = 0; i < 12; i += 1) {
      failState = stepPoppyRescue(
        failState,
        { laneShift: 0, steeringHold: false },
        1100,
        { tinAndScarecrowRescueBoost: 0, lionCourageResist: 0 }
      );
      if (failState.done) break;
    }

    expect(winState.success).toBe(true);
    expect(failState.success).toBe(false);
    expect(poppyRescueScore(winState)).toBeGreaterThan(poppyRescueScore(failState));
  });
});
