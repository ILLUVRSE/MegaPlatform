import type { Card, Suit } from '../../engine/cards';
import { allSuits } from '../../engine/cards';
import type { ThirtyOnePlayer, ThirtyOneState } from './types';

function cardValue(card: Card): number {
  if (card.rank === 14) return 11;
  if (card.rank >= 11) return 10;
  return card.rank;
}

export function scoreSuit(cards: readonly Card[], suit: Suit): number {
  let total = 0;
  for (let i = 0; i < cards.length; i += 1) {
    if (cards[i].suit === suit) total += cardValue(cards[i]);
  }
  return total;
}

export function bestThirtyOneScore(cards: readonly Card[]): number {
  let best = 0;
  const suits = allSuits();
  for (let i = 0; i < suits.length; i += 1) {
    best = Math.max(best, scoreSuit(cards, suits[i]));
  }
  return best;
}

export function createThirtyOneState(deck: Card[], players: ThirtyOnePlayer[]): ThirtyOneState {
  if (deck.length < 1) throw new Error('Deck too small');
  return {
    deck,
    players,
    discardTop: deck.shift() as Card,
    turn: 0,
    knockedBy: null,
    turnsAfterKnock: 0
  };
}

export function swapCard(hand: readonly Card[], dropIndex: number, incoming: Card): Card[] {
  if (dropIndex < 0 || dropIndex >= hand.length) return [...hand];
  const next = [...hand];
  next[dropIndex] = incoming;
  return next;
}

export function knock(state: ThirtyOneState): ThirtyOneState {
  if (state.knockedBy !== null) return state;
  return { ...state, knockedBy: state.turn, turnsAfterKnock: 0 };
}

export function advanceTurn(state: ThirtyOneState): ThirtyOneState {
  const nextTurn = (state.turn + 1) % state.players.length;
  const turnsAfterKnock = state.knockedBy !== null ? state.turnsAfterKnock + 1 : 0;
  return { ...state, turn: nextTurn, turnsAfterKnock };
}

export function isThirtyOneRoundOver(state: ThirtyOneState): boolean {
  if (state.knockedBy === null) return false;
  return state.turnsAfterKnock >= state.players.length - 1;
}

export function determineThirtyOneWinner(players: readonly ThirtyOnePlayer[]): { winner: string; scores: Record<string, number> } {
  let winner = players[0].id;
  let best = bestThirtyOneScore(players[0].hand);
  const scores: Record<string, number> = { [players[0].id]: best };

  for (let i = 1; i < players.length; i += 1) {
    const score = bestThirtyOneScore(players[i].hand);
    scores[players[i].id] = score;
    if (score > best) {
      best = score;
      winner = players[i].id;
    }
  }

  return { winner, scores };
}
