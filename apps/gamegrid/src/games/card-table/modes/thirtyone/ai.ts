import type { Card } from '../../engine/cards';
import { bestThirtyOneScore } from './rules';

export interface ThirtyOneAiMove {
  drawFrom: 'deck' | 'discard';
  dropIndex: number;
  knock: boolean;
}

export function chooseThirtyOneAiMove(hand: readonly Card[], discardTop: Card): ThirtyOneAiMove {
  const baseline = bestThirtyOneScore(hand);
  let bestMove: ThirtyOneAiMove = { drawFrom: 'deck', dropIndex: 0, knock: baseline >= 28 };

  for (let i = 0; i < hand.length; i += 1) {
    const next = [...hand];
    next[i] = discardTop;
    const score = bestThirtyOneScore(next);
    if (score > baseline) {
      bestMove = { drawFrom: 'discard', dropIndex: i, knock: score >= 29 };
      break;
    }
  }

  return bestMove;
}
