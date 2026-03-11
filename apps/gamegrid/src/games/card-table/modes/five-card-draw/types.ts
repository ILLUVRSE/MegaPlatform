import type { Card, HandRank } from '../../engine/cards';

export interface FiveCardDrawShowdown {
  playerRank: HandRank;
  aiRank: HandRank;
  winner: 'player' | 'ai' | 'push';
  payout: number;
}

export interface FiveCardDrawRound {
  player: Card[];
  ai: Card[];
  deck: Card[];
}
