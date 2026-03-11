import { describe, expect, it } from 'vitest';
import { canMoveTableauStack, canMoveToFoundation, canPlaceOnTableau } from './rules';

describe('solitaire move legality', () => {
  it('allows king on empty tableau', () => {
    expect(canPlaceOnTableau({ rank: 13, suit: 'S' }, null)).toBe(true);
  });

  it('blocks non-king on empty tableau', () => {
    expect(canPlaceOnTableau({ rank: 12, suit: 'S' }, null)).toBe(false);
  });

  it('enforces alternating color descending', () => {
    expect(canPlaceOnTableau({ rank: 7, suit: 'H' }, { rank: 8, suit: 'C', faceUp: true })).toBe(true);
    expect(canPlaceOnTableau({ rank: 7, suit: 'D' }, { rank: 8, suit: 'H', faceUp: true })).toBe(false);
  });

  it('foundation requires ace start then ascending same suit', () => {
    expect(canMoveToFoundation({ rank: 14, suit: 'S' }, null)).toBe(true);
    expect(canMoveToFoundation({ rank: 2, suit: 'S' }, { rank: 14, suit: 'S' })).toBe(false);
    expect(canMoveToFoundation({ rank: 2, suit: 'S' }, { rank: 1 + 1, suit: 'S' } as never)).toBe(false);
  });

  it('validates tableau stack ordering', () => {
    expect(canMoveTableauStack([
      { rank: 9, suit: 'S', faceUp: true },
      { rank: 8, suit: 'H', faceUp: true }
    ])).toBe(true);

    expect(canMoveTableauStack([
      { rank: 9, suit: 'S', faceUp: true },
      { rank: 8, suit: 'C', faceUp: true }
    ])).toBe(false);
  });
});
