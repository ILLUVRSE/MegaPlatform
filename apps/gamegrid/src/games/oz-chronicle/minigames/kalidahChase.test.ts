import { describe, expect, it } from 'vitest';
import {
  buildKalidahPattern,
  createKalidahChaseState,
  kalidahChaseScore,
  stepKalidahChase
} from './kalidahChase';

describe('kalidah chase minigame', () => {
  it('builds deterministic obstacle and token patterns from seed', () => {
    const a = buildKalidahPattern(2006);
    const b = buildKalidahPattern(2006);

    expect(Array.from(a.logMasks)).toEqual(Array.from(b.logMasks));
    expect(Array.from(a.narrowMasks)).toEqual(Array.from(b.narrowMasks));
    expect(Array.from(a.tokenLanes)).toEqual(Array.from(b.tokenLanes));
  });

  it('supports win and fail scoring paths', () => {
    const easyConfig = {
      durationMs: 14000,
      laneCount: 3,
      patternLength: 28,
      baseGap: 0.8,
      closeRatePerSecond: 0.02,
      tokenGain: 0.11,
      hitPenalty: 0.12,
      burstBoost: 0.16,
      roarBoost: 0.2,
      surviveGap: 0.1,
      logMaskChance: 0,
      narrowMaskChance: 0
    };
    let winState = createKalidahChaseState(77, { tinGuardHits: 1, roarCharges: 1 }, easyConfig);
    for (let i = 0; i < 24; i += 1) {
      winState = stepKalidahChase(
        winState,
        { laneShift: i % 3 === 0 ? 1 : 0, burst: i % 4 === 0, roar: i === 8 },
        620,
        easyConfig
      );
      if (winState.done) break;
    }

    let failState = createKalidahChaseState(81, { tinGuardHits: 0, roarCharges: 0 });
    for (let i = 0; i < 18; i += 1) {
      failState = stepKalidahChase(failState, { laneShift: 0, burst: false, roar: false }, 900);
      if (failState.done) break;
    }

    expect(winState.success).toBe(true);
    expect(failState.success).toBe(false);
    expect(kalidahChaseScore(winState)).toBeGreaterThan(kalidahChaseScore(failState));
  });
});
