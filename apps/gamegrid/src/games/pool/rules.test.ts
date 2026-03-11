import { describe, expect, it } from 'vitest';
import { createRuleState, resolveShot } from './rules';

describe('pool rules', () => {
  it('8-ball assigns group after first legal pocket', () => {
    const state = createRuleState('eight_ball');
    const out = resolveShot({
      state,
      strictRules: false,
      firstObjectHit: 3,
      lowestBallBeforeShot: null,
      cuePocketed: false,
      pocketed: [3],
      railAfterContact: true,
      ballsRemaining: [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    });

    expect(out.assignedGroup).toBe('solids');
    expect(out.nextState.eight.groups).toEqual(['solids', 'stripes']);
  });

  it('8-ball scratch causes ball-in-hand and turn passes', () => {
    const state = createRuleState('eight_ball');
    const out = resolveShot({
      state,
      strictRules: false,
      firstObjectHit: 1,
      lowestBallBeforeShot: null,
      cuePocketed: true,
      pocketed: [0],
      railAfterContact: true,
      ballsRemaining: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    });

    expect(out.foul).toBe(true);
    expect(out.nextState.ballInHand).toBe(true);
    expect(out.nextState.currentPlayer).toBe(1);
  });

  it('8-ball early 8 pocket is a loss', () => {
    const state = createRuleState('eight_ball');
    const out = resolveShot({
      state,
      strictRules: false,
      firstObjectHit: 8,
      lowestBallBeforeShot: null,
      cuePocketed: false,
      pocketed: [8],
      railAfterContact: true,
      ballsRemaining: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15]
    });

    expect(out.winner).toBe(1);
    expect(out.endReason).toMatch(/early/i);
  });

  it('8-ball wins after clearing group and pocketing 8', () => {
    let state = createRuleState('eight_ball');
    state = {
      ...state,
      eight: {
        groups: ['solids', 'stripes'],
        remainingSolids: 0,
        remainingStripes: 2
      }
    };

    const out = resolveShot({
      state,
      strictRules: false,
      firstObjectHit: 8,
      lowestBallBeforeShot: null,
      cuePocketed: false,
      pocketed: [8],
      railAfterContact: true,
      ballsRemaining: [9, 10]
    });

    expect(out.winner).toBe(0);
    expect(out.endReason).toMatch(/legally/i);
  });

  it('9-ball flags lowest-ball-first foul', () => {
    const state = createRuleState('nine_ball');
    const out = resolveShot({
      state,
      strictRules: false,
      firstObjectHit: 2,
      lowestBallBeforeShot: 1,
      cuePocketed: false,
      pocketed: [],
      railAfterContact: true,
      ballsRemaining: [1, 2, 3, 4, 5, 6, 7, 8, 9]
    });

    expect(out.foul).toBe(true);
    expect(out.foulReason).toMatch(/lowest/i);
  });

  it('9-ball legal 9 pocket ends game', () => {
    const state = createRuleState('nine_ball');
    const out = resolveShot({
      state,
      strictRules: false,
      firstObjectHit: 1,
      lowestBallBeforeShot: 1,
      cuePocketed: false,
      pocketed: [9],
      railAfterContact: true,
      ballsRemaining: [2, 3, 4, 5, 6, 7, 8]
    });

    expect(out.winner).toBe(0);
    expect(out.endReason).toMatch(/9-ball/i);
  });

  it('continues turn on legal pocket and passes on miss', () => {
    const state = createRuleState('nine_ball');
    const keep = resolveShot({
      state,
      strictRules: false,
      firstObjectHit: 1,
      lowestBallBeforeShot: 1,
      cuePocketed: false,
      pocketed: [4],
      railAfterContact: true,
      ballsRemaining: [1, 2, 3, 5, 6, 7, 8, 9]
    });
    expect(keep.keepTurn).toBe(true);
    expect(keep.nextState.currentPlayer).toBe(0);

    const pass = resolveShot({
      state,
      strictRules: false,
      firstObjectHit: 1,
      lowestBallBeforeShot: 1,
      cuePocketed: false,
      pocketed: [],
      railAfterContact: true,
      ballsRemaining: [1, 2, 3, 4, 5, 6, 7, 8, 9]
    });
    expect(pass.keepTurn).toBe(false);
    expect(pass.nextState.currentPlayer).toBe(1);
  });

  it('strict rules flags no-rail-after-contact foul', () => {
    const state = createRuleState('eight_ball');
    const out = resolveShot({
      state,
      strictRules: true,
      firstObjectHit: 1,
      lowestBallBeforeShot: null,
      cuePocketed: false,
      pocketed: [],
      railAfterContact: false,
      ballsRemaining: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    });

    expect(out.foul).toBe(true);
    expect(out.foulReason).toMatch(/rail/i);
  });
});
