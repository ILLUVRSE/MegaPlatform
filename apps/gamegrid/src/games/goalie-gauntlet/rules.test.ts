import { describe, expect, it } from 'vitest';
import { applyShotResolution, createMatchState, getStreakMultiplier, resolveSaveGrade } from './rules';
import type { GoalieSetup, ScheduledShot } from './types';

function setup(mode: GoalieSetup['mode']): GoalieSetup {
  return {
    mode,
    difficulty: 'medium',
    controls: 'drag',
    sensitivity: 'medium',
    options: {
      assistLaneIndicator: true,
      warmup: true,
      haptics: true,
      reducedMotion: false,
      lowQuality: false,
      preLaneIndicator: true
    }
  };
}

function shot(arriveAtMs = 1000): ScheduledShot {
  return {
    id: 1,
    patternId: 'test',
    sequenceIndex: 0,
    roundIndex: 0,
    zone: 'mid-left',
    telegraphZone: 'mid-left',
    realZone: 'mid-left',
    telegraph: 'both',
    type: 'straight',
    speed: 500,
    fake: false,
    fakeShiftAtMs: null,
    deflection: false,
    spin: false,
    rebound: false,
    reboundSpeedMultiplier: 1,
    reboundParentShotId: null,
    scoreMultiplier: 1,
    telegraphAtMs: 300,
    spawnAtMs: 600,
    arriveAtMs
  };
}

describe('goalie gauntlet rules scoring', () => {
  it('grades perfect/good/late/miss using contact timing windows', () => {
    const scheduled = shot(1000);

    const perfect = resolveSaveGrade(scheduled, { zone: 'mid-left', changedAtMs: 910, gestureType: 'drag' }, 'medium', 0);
    const good = resolveSaveGrade(scheduled, { zone: 'mid-left', changedAtMs: 790, gestureType: 'drag' }, 'medium', 0);
    const late = resolveSaveGrade(scheduled, { zone: 'mid-left', changedAtMs: 1120, gestureType: 'drag' }, 'medium', 0);
    const miss = resolveSaveGrade(scheduled, { zone: 'high-right', changedAtMs: 900, gestureType: 'drag' }, 'medium', 0);

    expect(perfect.grade).toBe('PERFECT');
    expect(good.grade).toBe('GOOD');
    expect(late.grade).toBe('LATE');
    expect(miss.grade).toBe('MISS');
  });

  it('applies streak multiplier and late/miss streak breaks', () => {
    let state = createMatchState(setup('survival'));
    const scheduled = shot(1000);

    state = applyShotResolution(state, scheduled, 'GOOD', -70).state;
    state = applyShotResolution(state, scheduled, 'PERFECT', -80).state;
    expect(state.stats.streak).toBe(2);
    expect(state.score).toBeGreaterThan(250);
    expect(getStreakMultiplier(state.stats.streak)).toBeCloseTo(1.2, 3);

    state = applyShotResolution(state, scheduled, 'LATE', 120).state;
    expect(state.stats.streak).toBe(0);

    state = applyShotResolution(state, scheduled, 'MISS', 1000).state;
    expect(state.stats.misses).toBe(1);
    expect(state.lives).toBe(2);
  });

  it('scores advanced saves and uses glove snag streak protection', () => {
    let state = createMatchState(setup('survival'));
    const low: ScheduledShot = { ...shot(1000), zone: 'low-left', realZone: 'low-left' };
    const high: ScheduledShot = { ...shot(1700), id: 2, zone: 'high-right', realZone: 'high-right' };

    const poke = resolveSaveGrade(low, { zone: 'low-left', changedAtMs: 910, gestureType: 'tap_dive', actionType: 'poke_check' }, 'medium', 0);
    state = applyShotResolution(state, low, poke.grade, poke.deltaMs, poke.actionType).state;
    expect(state.score).toBeGreaterThan(160);

    const snag = resolveSaveGrade(
      high,
      { zone: 'high-right', changedAtMs: 1640, gestureType: 'drag', actionType: 'glove_snag', holdDurationMs: 260 },
      'medium',
      1
    );
    state = applyShotResolution(state, high, snag.grade, snag.deltaMs, snag.actionType).state;
    expect(state.streakProtectionCharges).toBe(1);

    state = applyShotResolution(state, { ...shot(2400), id: 3 }, 'MISS', 2100, 'standard').state;
    expect(state.stats.streakProtectionsUsed).toBe(1);
  });

  it('requires post-shift timing on fake shots', () => {
    const fake: ScheduledShot = {
      ...shot(1000),
      zone: 'mid-right',
      telegraphZone: 'mid-left',
      realZone: 'mid-right',
      fake: true,
      fakeShiftAtMs: 180
    };
    const tooEarly = resolveSaveGrade(fake, { zone: 'mid-right', changedAtMs: 320, gestureType: 'drag' }, 'medium', 0);
    const corrected = resolveSaveGrade(fake, { zone: 'mid-right', changedAtMs: 760, gestureType: 'drag' }, 'medium', 0);
    expect(tooEarly.grade).toBe('MISS');
    expect(corrected.grade).not.toBe('MISS');
  });
});
