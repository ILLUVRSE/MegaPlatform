import { describe, expect, it } from 'vitest';
import { compareForeheadCards, settleForeheadRound } from './rules';

describe('forehead poker rules', () => {
  it('determines winner by hidden card rank', () => {
    expect(compareForeheadCards({ rank: 11, suit: 'S' }, { rank: 9, suit: 'H' })).toBe('player');
    expect(compareForeheadCards({ rank: 5, suit: 'S' }, { rank: 9, suit: 'H' })).toBe('ai');
  });

  it('applies payout correctly', () => {
    const out = settleForeheadRound({ rank: 13, suit: 'S' }, { rank: 12, suit: 'H' }, 30);
    expect(out.payout).toBe(30);
  });
});
