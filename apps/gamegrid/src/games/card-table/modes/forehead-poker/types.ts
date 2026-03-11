import type { Card } from '../../engine/cards';

export interface ForeheadRoundResult {
  winner: 'player' | 'ai' | 'push';
  payout: number;
  playerHidden: Card;
  aiHidden: Card;
}
