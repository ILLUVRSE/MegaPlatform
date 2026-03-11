import { describe, expect, it } from 'vitest';
import { replaceDiscards, settleFiveCardDraw } from './rules';

describe('five-card-draw rules', () => {
  it('replaces exactly selected discards', () => {
    const hand = [
      { rank: 2, suit: 'S' as const },
      { rank: 3, suit: 'S' as const },
      { rank: 4, suit: 'S' as const },
      { rank: 5, suit: 'S' as const },
      { rank: 6, suit: 'S' as const }
    ];
    const deck = [
      { rank: 14, suit: 'H' as const },
      { rank: 13, suit: 'H' as const }
    ];

    const next = replaceDiscards(hand, [1, 3], deck);
    expect(next[1].rank).toBe(14);
    expect(next[3].rank).toBe(13);
    expect(next[0].rank).toBe(2);
  });

  it('ranks showdown winner', () => {
    const out = settleFiveCardDraw({
      player: [
        { rank: 14, suit: 'S' },
        { rank: 14, suit: 'H' },
        { rank: 9, suit: 'D' },
        { rank: 8, suit: 'C' },
        { rank: 7, suit: 'S' }
      ],
      ai: [
        { rank: 13, suit: 'S' },
        { rank: 13, suit: 'H' },
        { rank: 6, suit: 'D' },
        { rank: 5, suit: 'C' },
        { rank: 4, suit: 'S' }
      ],
      wager: 20,
      ante: 5
    });

    expect(out.winner).toBe('player');
  });
});
