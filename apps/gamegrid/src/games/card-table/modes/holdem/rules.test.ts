import { describe, expect, it } from 'vitest';
import { resolveHoldemShowdown } from './rules';

describe('holdem rules', () => {
  it('distributes side pots correctly', () => {
    const board = [
      { rank: 2, suit: 'H' as const },
      { rank: 3, suit: 'H' as const },
      { rank: 4, suit: 'H' as const },
      { rank: 9, suit: 'C' as const },
      { rank: 12, suit: 'D' as const }
    ];

    const out = resolveHoldemShowdown(
      [
        {
          id: 'p1',
          cards: [
            { rank: 14, suit: 'H' as const },
            { rank: 13, suit: 'H' as const }
          ],
          committed: 100,
          folded: false
        },
        {
          id: 'p2',
          cards: [
            { rank: 10, suit: 'S' as const },
            { rank: 10, suit: 'D' as const }
          ],
          committed: 50,
          folded: false
        },
        {
          id: 'p3',
          cards: [
            { rank: 8, suit: 'S' as const },
            { rank: 8, suit: 'D' as const }
          ],
          committed: 100,
          folded: true
        }
      ],
      board
    );

    expect(out.payouts.p1 + out.payouts.p2 + out.payouts.p3).toBe(250);
    expect(out.pots.length).toBeGreaterThan(1);
    expect(out.payouts.p1).toBeGreaterThan(0);
  });
});
