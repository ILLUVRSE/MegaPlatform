import type { Card } from '../../engine/cards';
import type { SolitaireState, TableauCard } from './types';

function isRed(suit: Card['suit']): boolean {
  return suit === 'H' || suit === 'D';
}

export function canPlaceOnTableau(card: Card, targetTop: TableauCard | null): boolean {
  if (!targetTop) return card.rank === 13;
  const alternating = isRed(card.suit) !== isRed(targetTop.suit);
  return alternating && card.rank === targetTop.rank - 1;
}

export function canMoveToFoundation(card: Card, foundationTop: Card | null): boolean {
  if (!foundationTop) return card.rank === 14;
  return card.suit === foundationTop.suit && card.rank === foundationTop.rank + 1;
}

export function canMoveTableauStack(stack: readonly TableauCard[]): boolean {
  if (stack.length === 0) return false;
  for (let i = 0; i < stack.length; i += 1) {
    if (!stack[i].faceUp) return false;
  }
  for (let i = 1; i < stack.length; i += 1) {
    const a = stack[i - 1];
    const b = stack[i];
    if (isRed(a.suit) === isRed(b.suit)) return false;
    if (a.rank !== b.rank + 1) return false;
  }
  return true;
}

export function createSolitaireState(deck: Card[], drawCount: 1 | 3): SolitaireState {
  const tableau: TableauCard[][] = [];
  let cursor = 0;

  for (let pile = 0; pile < 7; pile += 1) {
    const cards: TableauCard[] = [];
    for (let i = 0; i <= pile; i += 1) {
      const card = deck[cursor++];
      cards.push({ ...card, faceUp: i === pile });
    }
    tableau.push(cards);
  }

  const stock = deck.slice(cursor);
  return {
    tableau,
    stock,
    waste: [],
    foundation: { S: [], H: [], D: [], C: [] },
    drawCount,
    moves: 0,
    startedAt: Date.now()
  };
}

export function drawFromStock(state: SolitaireState): SolitaireState {
  if (state.stock.length === 0) {
    return {
      ...state,
      stock: [...state.waste].reverse(),
      waste: []
    };
  }

  const count = Math.min(state.drawCount, state.stock.length);
  const drawn = state.stock.slice(0, count);
  return {
    ...state,
    stock: state.stock.slice(count),
    waste: [...state.waste, ...drawn],
    moves: state.moves + 1
  };
}

export function revealTopIfNeeded(pile: TableauCard[]): TableauCard[] {
  if (pile.length === 0) return pile;
  const next = [...pile];
  const topIndex = next.length - 1;
  if (!next[topIndex].faceUp) {
    next[topIndex] = { ...next[topIndex], faceUp: true };
  }
  return next;
}
