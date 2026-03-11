import type { Card } from '../../engine/cards';

export interface BlackjackHandValue {
  total: number;
  soft: boolean;
  blackjack: boolean;
  bust: boolean;
}

export interface BlackjackRoundResult {
  outcome: 'win' | 'loss' | 'push';
  payout: number;
  playerValue: BlackjackHandValue;
  dealerValue: BlackjackHandValue;
}

export interface BlackjackRoundState {
  deck: Card[];
  player: Card[];
  dealer: Card[];
  wager: number;
  finished: boolean;
  doubled: boolean;
}
