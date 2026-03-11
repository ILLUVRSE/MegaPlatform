import { describe, expect, it } from 'vitest';
import { applyThrowDartsHit, createInitialThrowDartsState } from './rules';
import type { DartHit, ThrowDartsOptions } from './types';

const single20: DartHit = {
  ring: 'single',
  number: 20,
  score: 20,
  multiplier: 1,
  isDouble: false,
  isBull: false,
  radial: 0,
  theta: 0
};

describe('throw darts rules', () => {
  it('applies 301 bust and resets to turn start', () => {
    const options: ThrowDartsOptions = {
      mode: '301',
      matchType: 'local',
      difficulty: 'medium',
      sensitivity: 'medium',
      aimMode: 'pullback',
      timingMeter: false,
      assistLevel: 'off',
      reducedRandomness: false,
      doubleOut: true,
      haptics: true,
      sfx: true,
      handedness: 'right',
      showCheckout: true,
      showCoach: true,
      vfxLevel: 'low',
      dprCap: 1.75,
      autoQuality: false
    };

    let state = createInitialThrowDartsState(options);
    expect(state.kind).toBe('x01');
    if (state.kind !== 'x01') return;

    state.players[0].remaining = 40;
    state.players[0].turnStartRemaining = 40;

    const bustHit: DartHit = {
      ...single20,
      score: 60,
      number: 20,
      multiplier: 3,
      ring: 'triple'
    };

    const next = applyThrowDartsHit(state, bustHit, options);
    expect(next.kind).toBe('x01');
    if (next.kind !== 'x01') return;
    expect(next.players[0].remaining).toBe(40);
    expect(next.currentPlayer).toBe(1);
    expect(next.players[0].lastTurnTotal).toBe(0);
  });

  it('requires double out to win 301', () => {
    const options: ThrowDartsOptions = {
      mode: '301',
      matchType: 'local',
      difficulty: 'medium',
      sensitivity: 'medium',
      aimMode: 'pullback',
      timingMeter: false,
      assistLevel: 'off',
      reducedRandomness: false,
      doubleOut: true,
      haptics: true,
      sfx: true,
      handedness: 'right',
      showCheckout: true,
      showCoach: true,
      vfxLevel: 'low',
      dprCap: 1.75,
      autoQuality: false
    };

    let state = createInitialThrowDartsState(options);
    expect(state.kind).toBe('x01');
    if (state.kind !== 'x01') return;

    state.players[0].remaining = 40;
    state.players[0].turnStartRemaining = 40;

    const winHit: DartHit = {
      ring: 'double',
      number: 20,
      score: 40,
      multiplier: 2,
      isDouble: true,
      isBull: false,
      radial: 0,
      theta: 0
    };

    state = applyThrowDartsHit(state, winHit, options);
    expect(state.kind).toBe('x01');
    if (state.kind !== 'x01') return;
    expect(state.winner).toBe(0);
    expect(state.players[0].remaining).toBe(0);
  });

  it('closes cricket marks and scores when opponent is open', () => {
    const options: ThrowDartsOptions = {
      mode: 'cricket',
      matchType: 'local',
      difficulty: 'medium',
      sensitivity: 'medium',
      aimMode: 'pullback',
      timingMeter: false,
      assistLevel: 'off',
      reducedRandomness: false,
      doubleOut: true,
      haptics: true,
      sfx: true,
      handedness: 'right',
      showCheckout: true,
      showCoach: true,
      vfxLevel: 'low',
      dprCap: 1.75,
      autoQuality: false
    };

    let state = createInitialThrowDartsState(options);
    expect(state.kind).toBe('cricket');
    if (state.kind !== 'cricket') return;

    state.players[0].marks[20] = 3;

    const triple20: DartHit = {
      ring: 'triple',
      number: 20,
      score: 60,
      multiplier: 3,
      isDouble: false,
      isBull: false,
      radial: 0,
      theta: 0
    };

    state = applyThrowDartsHit(state, triple20, options);
    expect(state.kind).toBe('cricket');
    if (state.kind !== 'cricket') return;

    expect(state.players[0].points).toBe(60);
    expect(state.players[0].lastTurnTotal).toBe(0);
  });
});
