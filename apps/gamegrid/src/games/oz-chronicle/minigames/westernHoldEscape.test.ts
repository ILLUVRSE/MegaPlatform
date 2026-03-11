import { describe, expect, it } from 'vitest';
import {
  buildWesternHoldLayout,
  createWesternHoldEscapeState,
  DEFAULT_WESTERN_HOLD_ESCAPE_CONFIG,
  stepWesternHoldEscape,
  westernHoldEscapeScore
} from './westernHoldEscape';
import { canUseGoldenCap, createInitialState, useGoldenCapCommand } from '../rules';

describe('western hold escape minigame', () => {
  it('builds deterministic patrol and hazard layout from seed + difficulty + node', () => {
    const a = buildWesternHoldLayout(2110, 1, 'western-hold-escape');
    const b = buildWesternHoldLayout(2110, 1, 'western-hold-escape');
    const c = buildWesternHoldLayout(2110, 1.12, 'western-hold-escape');

    expect(Array.from(a.patrolMasks)).toEqual(Array.from(b.patrolMasks));
    expect(Array.from(a.coverMasks)).toEqual(Array.from(b.coverMasks));
    expect(Array.from(a.hazardMasks)).toEqual(Array.from(b.hazardMasks));
    expect(Array.from(a.tokenLanes)).toEqual(Array.from(b.tokenLanes));
    expect(Array.from(a.patrolMasks)).not.toEqual(Array.from(c.patrolMasks));
  });

  it('supports win/fail thresholds and stable scoring', () => {
    const easy = {
      ...DEFAULT_WESTERN_HOLD_ESCAPE_CONFIG,
      durationMs: 11000,
      patternLength: 20,
      targetTokens: 1,
      baseAlarmPerSecond: 0.01,
      sweepAlarmPerEvent: 0.04,
      hazardAlarmPerEvent: 0.06,
      successAlarmThreshold: 0.95,
      patrolChance: 0.2,
      hazardChance: 0.2,
      coverChance: 0.62
    };
    let failState = createWesternHoldEscapeState(2201, 1.12, 'node-west');
    for (let i = 0; i < 15; i += 1) {
      failState = stepWesternHoldEscape(
        failState,
        {
          laneShift: 0,
          hide: false,
          useScarecrowReveal: false,
          useTinLift: false,
          useLionPause: false,
          useCommand: false
        },
        760,
        {
          scarecrowReveal: false,
          tinLift: false,
          lionPause: false,
          goldenCapReady: false
        }
      );
      if (failState.done) break;
    }

    const winState = {
      ...createWesternHoldEscapeState(2200, 0.92, 'node-west', easy),
      elapsedMs: Math.round(easy.durationMs * 0.86),
      tokensCollected: 2,
      alarm: 0.16,
      detections: 1,
      done: true,
      success: true
    };

    expect(winState.success).toBe(true);
    expect(failState.success).toBe(false);
    expect(westernHoldEscapeScore(winState, easy)).toBeGreaterThan(westernHoldEscapeScore(failState));
  });

  it('spends golden cap command and decrements uses safely', () => {
    let state = createInitialState(7777);
    state = {
      ...state,
      goldenCap: {
        acquired: true,
        usesRemaining: 1,
        commandHistory: []
      }
    };

    expect(canUseGoldenCap(state)).toBe(true);

    let mini = createWesternHoldEscapeState(2300, 1, 'node-command');
    mini = stepWesternHoldEscape(
      mini,
      {
        laneShift: 0,
        hide: true,
        useScarecrowReveal: false,
        useTinLift: false,
        useLionPause: false,
        useCommand: true
      },
      220,
      {
        scarecrowReveal: false,
        tinLift: false,
        lionPause: false,
        goldenCapReady: canUseGoldenCap(state)
      }
    );

    if (mini.spentCommandThisStep) {
      state = useGoldenCapCommand(state, 'clear-path');
    }

    expect(mini.commandSafeRemainingMs).toBeGreaterThan(0);
    expect(state.goldenCap.usesRemaining).toBe(0);
    expect(canUseGoldenCap(state)).toBe(false);
    state = useGoldenCapCommand(state, 'clear-path');
    expect(state.goldenCap.usesRemaining).toBe(0);
  });
});
