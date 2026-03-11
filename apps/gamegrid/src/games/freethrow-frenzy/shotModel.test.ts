import { describe, expect, it } from 'vitest';
import { mapInputToShotArc, resolveShotOutcome } from './shotModel';
import { SHOT_SPOTS, type ShotInput } from './types';

describe('freethrow shot model', () => {
  it('is deterministic for the same input and context', () => {
    const input: ShotInput = {
      aim: 0.18,
      power: 0.66,
      meterPhase: 0.53,
      controlScheme: 'arc_swipe'
    };

    const context = {
      spot: SHOT_SPOTS.midrange,
      difficulty: 'medium' as const,
      timingMeter: true,
      pressureEnabled: true,
      pressure: 0.4,
      assist: true,
      hoopX: 980,
      hoopY: 250,
      rimRadius: 34,
      backboardX: 1060
    };

    const a = mapInputToShotArc(input, context);
    const b = mapInputToShotArc(input, context);

    expect(a).toEqual(b);
  });

  it('detects clean swishes near the hoop centerline', () => {
    const context = {
      spot: SHOT_SPOTS.free_throw,
      difficulty: 'easy' as const,
      timingMeter: true,
      pressureEnabled: false,
      pressure: 0,
      assist: true,
      hoopX: 980,
      hoopY: 250,
      rimRadius: 34,
      backboardX: 1060
    };

    const arc = {
      releaseX: context.hoopX,
      releaseY: 540,
      targetX: context.hoopX,
      targetY: context.hoopY,
      flightTime: 0.8,
      gravity: 1500,
      velocityX: 0,
      velocityY: -650,
      timingWindow: 0.1,
      timingQuality: 1,
      timingBucket: 'perfect' as const,
      pressurePenalty: 0,
      predictedMakeChance: 0.9
    };

    const outcome = resolveShotOutcome(arc, context, 0.5, 0.5);

    expect(outcome.made).toBe(true);
    expect(outcome.swish).toBe(true);
  });
});
