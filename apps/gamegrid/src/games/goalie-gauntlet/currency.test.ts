import { describe, expect, it } from 'vitest';
import { calculateRewards, levelFromXp } from './currency';

describe('goalie-gauntlet currency rewards', () => {
  it('calculates deterministic bounded rewards', () => {
    const input = {
      mode: 'career' as const,
      score: 4200,
      stats: {
        shotsFaced: 30,
        saves: 27,
        misses: 3,
        perfectSaves: 14,
        goodSaves: 10,
        lateSaves: 3,
        pokeChecks: 2,
        gloveSnags: 1,
        desperationDives: 2,
        reboundsFaced: 8,
        reboundsSaved: 7,
        streakProtectionsUsed: 1,
        streak: 4,
        bestStreak: 9
      },
      matchCompleted: true,
      careerObjectivePassed: true
    };

    const a = calculateRewards(input);
    const b = calculateRewards(input);

    expect(a).toEqual(b);
    expect(a.coins).toBeGreaterThan(0);
    expect(a.coins).toBeLessThanOrEqual(950);
    expect(a.xp).toBeLessThanOrEqual(4200);
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(2000)).toBeGreaterThan(1);
  });
});
