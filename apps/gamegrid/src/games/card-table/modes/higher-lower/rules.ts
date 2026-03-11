import type { Card } from '../../engine/cards';
import type { HigherLowerGuess, HigherLowerOutcome } from './types';

export function resolveHigherLowerGuess(params: {
  current: Card;
  next: Card;
  guess: HigherLowerGuess;
  streak: number;
  equalPolicy: 'lose' | 'push';
}): HigherLowerOutcome {
  const { current, next, guess, streak, equalPolicy } = params;

  if (next.rank === current.rank) {
    if (equalPolicy === 'push') {
      return {
        correct: true,
        ended: false,
        streak,
        multiplier: 1 + streak * 0.25,
        nextCurrent: next,
        reason: 'equal'
      };
    }
    return {
      correct: false,
      ended: true,
      streak: 0,
      multiplier: 1,
      nextCurrent: next,
      reason: 'equal'
    };
  }

  const isHigher = next.rank > current.rank;
  const correct = (guess === 'higher' && isHigher) || (guess === 'lower' && !isHigher);
  if (!correct) {
    return {
      correct: false,
      ended: true,
      streak: 0,
      multiplier: 1,
      nextCurrent: next,
      reason: 'wrong'
    };
  }

  const nextStreak = streak + 1;
  return {
    correct: true,
    ended: false,
    streak: nextStreak,
    multiplier: 1 + nextStreak * 0.25,
    nextCurrent: next,
    reason: 'correct'
  };
}

export function resolveHigherLowerPayout(wager: number, streak: number): number {
  if (streak <= 0) return -wager;
  return Math.floor(wager * (1 + streak * 0.25));
}
