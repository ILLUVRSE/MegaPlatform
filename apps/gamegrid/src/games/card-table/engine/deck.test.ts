import { describe, expect, it } from 'vitest';
import { createDeck, shuffleDeck } from './deck';
import { cardToString } from './cards';

describe('card-table deck', () => {
  it('shuffles reproducibly with seed', () => {
    const deck = createDeck();
    const a = shuffleDeck(deck, 'seed-1').slice(0, 10).map(cardToString);
    const b = shuffleDeck(deck, 'seed-1').slice(0, 10).map(cardToString);
    const c = shuffleDeck(deck, 'seed-2').slice(0, 10).map(cardToString);

    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});
