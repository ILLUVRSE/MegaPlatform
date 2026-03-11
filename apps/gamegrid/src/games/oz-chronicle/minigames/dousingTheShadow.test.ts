import { describe, expect, it } from 'vitest';
import {
  buildDousingPattern,
  createDousingState,
  DEFAULT_DOUSING_THE_SHADOW_CONFIG,
  dousingScore,
  stepDousingTheShadow
} from './dousingTheShadow';
import { canUseGoldenCap, createInitialState, useGoldenCapCommand } from '../rules';

describe('dousing the shadow minigame', () => {
  it('builds deterministic swell and peak patterns', () => {
    const a = buildDousingPattern(2601, 1, 'dousing-node');
    const b = buildDousingPattern(2601, 1, 'dousing-node');
    const c = buildDousingPattern(2601, 1.12, 'dousing-node');

    expect(Array.from(a.swellMasks)).toEqual(Array.from(b.swellMasks));
    expect(Array.from(a.safeMasks)).toEqual(Array.from(b.safeMasks));
    expect(Array.from(a.peakWindows)).toEqual(Array.from(b.peakWindows));
    expect(Array.from(a.swellMasks)).not.toEqual(Array.from(c.swellMasks));
  });

  it('supports timing window scoring and fail state', () => {
    const cfg = DEFAULT_DOUSING_THE_SHADOW_CONFIG;
    let fail = createDousingState(2602, 1.12, 'dousing-node', cfg);
    for (let i = 0; i < 15; i += 1) {
      fail = stepDousingTheShadow(
        fail,
        { laneShift: 0, readyWater: true, useScarecrowWindow: false, useTinWard: false, useLionSteady: false, useCommand: false },
        760,
        { scarecrowWindow: false, tinWard: false, lionSteady: false, goldenCapReady: false },
        cfg
      );
      if (fail.done) break;
    }

    const win = {
      ...createDousingState(2600, 0.92, 'dousing-node', cfg),
      elapsedMs: Math.round(cfg.durationMs * 0.83),
      dousesHit: cfg.requiredDouses,
      douseMisses: 0,
      fearMeter: 0.18,
      done: true,
      success: true
    };

    expect(win.success).toBe(true);
    expect(fail.success).toBe(false);
    expect(dousingScore(win, cfg)).toBeGreaterThan(dousingScore(fail, cfg));
  });

  it('optional golden cap spend decrements and clamps', () => {
    let state = createInitialState(9991);
    state = {
      ...state,
      goldenCap: {
        acquired: true,
        usesRemaining: 1,
        commandHistory: []
      }
    };

    let mini = createDousingState(2603, 1, 'dousing-node');
    mini = stepDousingTheShadow(
      mini,
      { laneShift: 0, readyWater: false, useScarecrowWindow: false, useTinWard: false, useLionSteady: false, useCommand: true },
      250,
      { scarecrowWindow: false, tinWard: false, lionSteady: false, goldenCapReady: canUseGoldenCap(state) }
    );

    if (mini.spentCommandThisStep) {
      state = useGoldenCapCommand(state, 'clear-path');
    }

    expect(mini.clearSwellRemainingMs).toBeGreaterThan(0);
    expect(state.goldenCap.usesRemaining).toBe(0);

    state = useGoldenCapCommand(state, 'clear-path');
    expect(state.goldenCap.usesRemaining).toBe(0);
  });
});
