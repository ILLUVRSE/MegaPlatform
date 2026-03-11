import { compareHandRank, evaluateFiveCardHand, type Card } from '../../engine/cards';
import { createDeck, deal, shuffleDeck } from '../../engine/deck';
import type { FiveCardDrawRound, FiveCardDrawShowdown } from './types';

export function createFiveCardDrawRound(seed?: string | number): FiveCardDrawRound {
  const deck = shuffleDeck(createDeck(), seed);
  return {
    player: deal(deck, 5),
    ai: deal(deck, 5),
    deck
  };
}

export function replaceDiscards(hand: readonly Card[], discardIndexes: readonly number[], deck: Card[]): Card[] {
  const unique = [...new Set(discardIndexes)].filter((index) => index >= 0 && index < hand.length);
  const next = [...hand];
  for (let i = 0; i < unique.length; i += 1) {
    const card = deck.shift();
    if (!card) break;
    next[unique[i]] = card;
  }
  return next;
}

export function settleFiveCardDraw(params: {
  player: readonly Card[];
  ai: readonly Card[];
  wager: number;
  ante: number;
}): FiveCardDrawShowdown {
  const { player, ai, wager, ante } = params;
  const playerRank = evaluateFiveCardHand(player);
  const aiRank = evaluateFiveCardHand(ai);
  const cmp = compareHandRank(playerRank, aiRank);
  const pot = wager * 2 + ante * 2;

  if (cmp > 0) return { playerRank, aiRank, winner: 'player', payout: pot / 2 };
  if (cmp < 0) return { playerRank, aiRank, winner: 'ai', payout: -pot / 2 };
  return { playerRank, aiRank, winner: 'push', payout: 0 };
}
