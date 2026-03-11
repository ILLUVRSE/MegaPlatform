import { describe, expect, it } from 'vitest';
import { evaluateBlackjack, settleBlackjack, shouldDealerHit } from './rules';

describe('blackjack rules', () => {
  it('dealer stands on 17', () => {
    expect(
      shouldDealerHit([
        { rank: 10, suit: 'S' },
        { rank: 7, suit: 'H' }
      ])
    ).toBe(false);
  });

  it('detects blackjack and payout', () => {
    const result = settleBlackjack({
      deck: [{ rank: 2, suit: 'C' }],
      player: [
        { rank: 14, suit: 'S' },
        { rank: 13, suit: 'H' }
      ],
      dealer: [
        { rank: 10, suit: 'D' },
        { rank: 7, suit: 'C' }
      ],
      wager: 20,
      finished: true,
      doubled: false
    });

    expect(result.playerValue.blackjack).toBe(true);
    expect(result.payout).toBe(30);
  });

  it('handles bust totals', () => {
    const value = evaluateBlackjack([
      { rank: 10, suit: 'S' },
      { rank: 9, suit: 'H' },
      { rank: 5, suit: 'D' }
    ]);
    expect(value.bust).toBe(true);
  });
});
