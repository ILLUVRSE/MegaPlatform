import { describe, expect, it } from 'vitest';
import { resolveHigherLowerGuess } from './rules';

describe('higher-lower rules', () => {
  it('ends streak on incorrect guess', () => {
    const out = resolveHigherLowerGuess({
      current: { rank: 9, suit: 'S' },
      next: { rank: 5, suit: 'H' },
      guess: 'higher',
      streak: 3,
      equalPolicy: 'lose'
    });

    expect(out.ended).toBe(true);
    expect(out.streak).toBe(0);
  });

  it('respects equal policy', () => {
    const lose = resolveHigherLowerGuess({
      current: { rank: 8, suit: 'S' },
      next: { rank: 8, suit: 'D' },
      guess: 'lower',
      streak: 1,
      equalPolicy: 'lose'
    });
    const push = resolveHigherLowerGuess({
      current: { rank: 8, suit: 'S' },
      next: { rank: 8, suit: 'D' },
      guess: 'lower',
      streak: 1,
      equalPolicy: 'push'
    });

    expect(lose.ended).toBe(true);
    expect(push.ended).toBe(false);
  });
});
