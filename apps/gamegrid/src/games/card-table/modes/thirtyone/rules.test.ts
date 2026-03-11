import { describe, expect, it } from 'vitest';
import { bestThirtyOneScore, determineThirtyOneWinner, isThirtyOneRoundOver, scoreSuit } from './rules';

describe('31 rules', () => {
  it('scores suit totals correctly', () => {
    const cards = [
      { rank: 14, suit: 'H' as const },
      { rank: 10, suit: 'H' as const },
      { rank: 9, suit: 'C' as const }
    ];

    expect(scoreSuit(cards, 'H')).toBe(21);
    expect(bestThirtyOneScore(cards)).toBe(21);
  });

  it('determines winner by best suit score', () => {
    const out = determineThirtyOneWinner([
      {
        id: 'player',
        hand: [
          { rank: 14, suit: 'S' as const },
          { rank: 10, suit: 'S' as const },
          { rank: 8, suit: 'D' as const }
        ]
      },
      {
        id: 'ai',
        hand: [
          { rank: 9, suit: 'H' as const },
          { rank: 8, suit: 'H' as const },
          { rank: 2, suit: 'H' as const }
        ]
      }
    ]);

    expect(out.winner).toBe('player');
  });

  it('ends after full cycle post-knock', () => {
    expect(isThirtyOneRoundOver({
      deck: [],
      discardTop: { rank: 2, suit: 'S' },
      players: [{ id: 'player', hand: [] }, { id: 'ai', hand: [] }],
      turn: 0,
      knockedBy: 0,
      turnsAfterKnock: 1
    })).toBe(true);
  });
});
