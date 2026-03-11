import type { Card, HandRank } from '../../engine/cards';

export interface HoldemPlayer {
  id: string;
  cards: [Card, Card];
  committed: number;
  folded: boolean;
}

export interface HoldemPot {
  amount: number;
  eligible: string[];
}

export interface HoldemShowdownResult {
  payouts: Record<string, number>;
  ranks: Record<string, HandRank>;
  pots: HoldemPot[];
}
