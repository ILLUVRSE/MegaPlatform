import type { Card } from '../../engine/cards';

export interface TableauCard extends Card {
  faceUp: boolean;
}

export interface SolitaireState {
  tableau: TableauCard[][];
  stock: Card[];
  waste: Card[];
  foundation: Record<'S' | 'H' | 'D' | 'C', Card[]>;
  drawCount: 1 | 3;
  moves: number;
  startedAt: number;
}
