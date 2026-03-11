import type { Card } from '../../engine/cards';

export function chooseForeheadAiBet(baseBet: number, seenPlayerCard: Card): number {
  if (seenPlayerCard.rank >= 12) return Math.max(1, Math.floor(baseBet * 0.5));
  if (seenPlayerCard.rank <= 6) return Math.floor(baseBet * 1.5);
  return baseBet;
}
