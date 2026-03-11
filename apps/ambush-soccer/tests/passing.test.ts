import { describe, expect, it } from 'vitest';
import { selectPassTarget } from '../src/game/systems/Passing';
import type { PassCandidate } from '../src/shared/types';

describe('selectPassTarget', () => {
  const candidates: PassCandidate[] = [
    { id: 'a', team: 'home', fromBallOwner: true, position: { x: 180, y: 100 } },
    { id: 'b', team: 'home', fromBallOwner: true, position: { x: 160, y: 160 } },
    { id: 'c', team: 'home', fromBallOwner: true, position: { x: 40, y: 100 } }
  ];

  it('picks teammate in aim cone', () => {
    const target = selectPassTarget({ x: 100, y: 100 }, { x: 1, y: 0 }, candidates, 300, 70);
    expect(target?.id).toBe('a');
  });

  it('returns null when no candidate is in cone', () => {
    const target = selectPassTarget({ x: 100, y: 100 }, { x: 0, y: -1 }, candidates, 300, 20);
    expect(target).toBeNull();
  });
});
