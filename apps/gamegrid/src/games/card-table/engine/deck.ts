import type { Card, Suit } from './cards';
import { createRng, type Rng } from './rng';

const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C'] as const;

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (let rank = 2; rank <= 14; rank += 1) {
    for (let i = 0; i < SUITS.length; i += 1) {
      deck.push({ rank, suit: SUITS[i] });
    }
  }
  return deck;
}

export function shuffleDeck(input: readonly Card[], seed?: string | number): Card[] {
  const deck = [...input];
  const rng: Rng = createRng(seed ?? Date.now());
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = rng.nextInt(i + 1);
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

export function deal(deck: Card[], count: number): Card[] {
  if (count <= 0) return [];
  return deck.splice(0, count);
}
