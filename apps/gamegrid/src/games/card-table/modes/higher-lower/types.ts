import type { Card } from '../../engine/cards';

export type HigherLowerGuess = 'higher' | 'lower';

export interface HigherLowerOutcome {
  correct: boolean;
  ended: boolean;
  streak: number;
  multiplier: number;
  nextCurrent: Card;
  reason: 'correct' | 'wrong' | 'equal';
}
