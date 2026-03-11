import { describe, expect, it } from 'vitest';
import { compareHandRank, evaluateBestHand, evaluateFiveCardHand, type Card } from './cards';

describe('card-table hand evaluator', () => {
  it('ranks known hand classes correctly', () => {
    const straightFlush: Card[] = [
      { rank: 10, suit: 'H' },
      { rank: 11, suit: 'H' },
      { rank: 12, suit: 'H' },
      { rank: 13, suit: 'H' },
      { rank: 14, suit: 'H' }
    ];
    const fullHouse: Card[] = [
      { rank: 9, suit: 'S' },
      { rank: 9, suit: 'H' },
      { rank: 9, suit: 'D' },
      { rank: 3, suit: 'S' },
      { rank: 3, suit: 'H' }
    ];

    const sf = evaluateFiveCardHand(straightFlush);
    const fh = evaluateFiveCardHand(fullHouse);
    expect(compareHandRank(sf, fh)).toBeGreaterThan(0);
  });

  it('chooses best 5 from 7 cards', () => {
    const cards: Card[] = [
      { rank: 14, suit: 'S' },
      { rank: 14, suit: 'H' },
      { rank: 14, suit: 'D' },
      { rank: 9, suit: 'C' },
      { rank: 9, suit: 'S' },
      { rank: 2, suit: 'H' },
      { rank: 3, suit: 'D' }
    ];

    const best = evaluateBestHand(cards);
    expect(best.label).toBe('Full House');
  });
});
