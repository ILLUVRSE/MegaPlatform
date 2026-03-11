import { describe, expect, it } from 'vitest';
import { evaluateChallenge, getDailyChallenge, loadGoalieChallenges } from './challenges';

describe('goalie gauntlet challenges', () => {
  it('loads >=12 challenge entries with required fields', () => {
    const catalog = loadGoalieChallenges();
    expect(catalog.challenges.length).toBeGreaterThanOrEqual(12);

    for (const challenge of catalog.challenges) {
      expect(challenge.id.length).toBeGreaterThan(0);
      expect(challenge.patternId.length).toBeGreaterThan(0);
      expect(challenge.shotCount).toBeGreaterThan(5);
    }
  });

  it('evaluates pass/fail and resolves deterministic daily selection', () => {
    const catalog = loadGoalieChallenges();

    const pass = evaluateChallenge(
      catalog.challenges[0],
      {
        saves: 20,
        misses: 0,
        perfectSaves: 12,
        lateSaves: 0,
        bestPerfectStreak: 12,
        elapsedMs: 5000
      }
    );

    const fail = evaluateChallenge(
      catalog.challenges[0],
      {
        saves: 2,
        misses: 8,
        perfectSaves: 0,
        lateSaves: 4,
        bestPerfectStreak: 1,
        elapsedMs: 30_000
      }
    );

    const dayA = getDailyChallenge(catalog.challenges, '2026-02-15');
    const dayB = getDailyChallenge(catalog.challenges, '2026-02-15');

    expect(pass.passed).toBe(true);
    expect(pass.failed).toBe(false);
    expect(fail.failed).toBe(true);
    expect(dayA.id).toBe(dayB.id);
  });
});
