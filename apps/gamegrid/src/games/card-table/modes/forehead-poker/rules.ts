import type { Card } from '../../engine/cards';
import type { ForeheadRoundResult } from './types';

export function compareForeheadCards(playerHidden: Card, aiHidden: Card): 'player' | 'ai' | 'push' {
  if (playerHidden.rank > aiHidden.rank) return 'player';
  if (playerHidden.rank < aiHidden.rank) return 'ai';
  return 'push';
}

export function settleForeheadRound(playerHidden: Card, aiHidden: Card, wager: number): ForeheadRoundResult {
  const winner = compareForeheadCards(playerHidden, aiHidden);
  const payout = winner === 'player' ? wager : winner === 'ai' ? -wager : 0;
  return { winner, payout, playerHidden, aiHidden };
}
