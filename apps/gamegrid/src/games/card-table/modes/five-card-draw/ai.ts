import { evaluateFiveCardHand, type Card } from '../../engine/cards';

export function chooseDrawDiscards(hand: readonly Card[]): number[] {
  const rank = evaluateFiveCardHand(hand);
  if (rank.category >= 1) {
    return [];
  }

  const keepRanks = new Set<number>(hand.map((c) => c.rank).sort((a, b) => b - a).slice(0, 2));
  const discards: number[] = [];
  for (let i = 0; i < hand.length; i += 1) {
    if (!keepRanks.has(hand[i].rank)) discards.push(i);
  }
  return discards;
}
