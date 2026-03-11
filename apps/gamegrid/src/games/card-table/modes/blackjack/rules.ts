import type { Card } from '../../engine/cards';
import { createDeck, deal, shuffleDeck } from '../../engine/deck';
import type { BlackjackHandValue, BlackjackRoundResult, BlackjackRoundState } from './types';

export const BLACKJACK_PAYOUT = 1.5;

export function evaluateBlackjack(cards: readonly Card[]): BlackjackHandValue {
  let total = 0;
  let aces = 0;
  for (let i = 0; i < cards.length; i += 1) {
    const rank = cards[i].rank;
    if (rank === 14) {
      total += 11;
      aces += 1;
    } else if (rank >= 11 && rank <= 13) {
      total += 10;
    } else {
      total += rank;
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return {
    total,
    soft: aces > 0,
    blackjack: cards.length === 2 && total === 21,
    bust: total > 21
  };
}

export function shouldDealerHit(cards: readonly Card[]): boolean {
  const value = evaluateBlackjack(cards);
  if (value.total < 17) return true;
  return false;
}

export function createBlackjackRound(wager: number, seed?: string | number): BlackjackRoundState {
  const deck = shuffleDeck(createDeck(), seed);
  return {
    deck,
    player: deal(deck, 2),
    dealer: deal(deck, 2),
    wager,
    finished: false,
    doubled: false
  };
}

export function playerHit(state: BlackjackRoundState): BlackjackRoundState {
  if (state.finished) return state;
  const next = { ...state, player: [...state.player], dealer: [...state.dealer], deck: [...state.deck] };
  next.player.push(...deal(next.deck, 1));
  if (evaluateBlackjack(next.player).bust) {
    next.finished = true;
  }
  return next;
}

export function playerDouble(state: BlackjackRoundState): BlackjackRoundState {
  if (state.finished || state.player.length !== 2) return state;
  const next = { ...state, player: [...state.player], dealer: [...state.dealer], deck: [...state.deck], doubled: true };
  next.player.push(...deal(next.deck, 1));
  next.finished = true;
  return next;
}

export function settleBlackjack(state: BlackjackRoundState): BlackjackRoundResult {
  const next = { ...state, dealer: [...state.dealer], deck: [...state.deck] };
  const playerValue = evaluateBlackjack(next.player);

  if (!playerValue.bust) {
    while (shouldDealerHit(next.dealer)) {
      next.dealer.push(...deal(next.deck, 1));
    }
  }

  const dealerValue = evaluateBlackjack(next.dealer);
  const wager = state.wager * (state.doubled ? 2 : 1);

  if (playerValue.blackjack && !dealerValue.blackjack) {
    return { outcome: 'win', payout: Math.floor(wager * BLACKJACK_PAYOUT), playerValue, dealerValue };
  }

  if (playerValue.bust) {
    return { outcome: 'loss', payout: -wager, playerValue, dealerValue };
  }

  if (dealerValue.bust) {
    return { outcome: 'win', payout: wager, playerValue, dealerValue };
  }

  if (playerValue.total > dealerValue.total) {
    return { outcome: 'win', payout: wager, playerValue, dealerValue };
  }

  if (playerValue.total < dealerValue.total) {
    return { outcome: 'loss', payout: -wager, playerValue, dealerValue };
  }

  return { outcome: 'push', payout: 0, playerValue, dealerValue };
}
