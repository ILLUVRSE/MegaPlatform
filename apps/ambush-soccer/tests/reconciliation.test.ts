import { describe, expect, it } from 'vitest';
import { computeStateError, shouldReconcile, smoothCorrection } from '../src/game/net/Reconciliation';

describe('reconciliation math', () => {
  it('triggers reconcile when error exceeds tolerance', () => {
    const error = computeStateError(
      [{ id: 'a', x: 0, y: 0 }],
      {
        players: [{ id: 'a', team: 'home', x: 100, y: 100, vx: 0, vy: 0, stamina: 100 }],
        ball: { x: 0, y: 0, vx: 0, vy: 0, ownerId: null },
        homeScore: 0,
        awayScore: 0,
        timeRemainingSec: 1,
        inOvertime: false,
        checksum: 0
      }
    );
    expect(shouldReconcile(error, 10)).toBe(true);
  });

  it('smooths correction toward target', () => {
    expect(smoothCorrection(0, 100, 0.25)).toBe(25);
  });
});
