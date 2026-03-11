import type { Card } from '../../engine/cards';

export interface ThirtyOnePlayer {
  id: string;
  hand: Card[];
}

export interface ThirtyOneState {
  deck: Card[];
  discardTop: Card;
  players: ThirtyOnePlayer[];
  turn: number;
  knockedBy: number | null;
  turnsAfterKnock: number;
}
