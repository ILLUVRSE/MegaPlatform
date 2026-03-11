import type { Card } from '../../engine/cards';

export type HoldemAiPersonality = 'tight' | 'balanced' | 'loose';

export interface HoldemAiAction {
  action: 'fold' | 'call' | 'raise';
  raiseTo?: number;
}

function preflopStrength(cards: readonly Card[]): number {
  const [a, b] = cards;
  const pairBonus = a.rank === b.rank ? 25 : 0;
  const high = Math.max(a.rank, b.rank);
  const suited = a.suit === b.suit ? 4 : 0;
  const connected = Math.abs(a.rank - b.rank) <= 2 ? 3 : 0;
  return high + pairBonus + suited + connected;
}

export function chooseHoldemAiAction(params: {
  cards: [Card, Card];
  toCall: number;
  minRaise: number;
  stack: number;
  personality: HoldemAiPersonality;
}): HoldemAiAction {
  const { cards, toCall, minRaise, stack, personality } = params;
  const s = preflopStrength(cards);
  const foldLine = personality === 'tight' ? 17 : personality === 'balanced' ? 14 : 11;
  const raiseLine = personality === 'tight' ? 29 : personality === 'balanced' ? 25 : 21;

  if (s < foldLine && toCall > 0) return { action: 'fold' };
  if (s >= raiseLine && stack > toCall + minRaise) {
    return { action: 'raise', raiseTo: toCall + minRaise };
  }
  return { action: 'call' };
}
