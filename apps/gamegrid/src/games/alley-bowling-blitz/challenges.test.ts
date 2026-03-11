import { describe, expect, it } from 'vitest';
import { evaluateChallenge, loadBowlingChallenges } from './challenges';

describe('alley bowling challenges', () => {
  it('validates challenge catalog has >=10 entries and required fields', () => {
    const catalog = loadBowlingChallenges();
    expect(catalog.challenges.length).toBeGreaterThanOrEqual(10);

    for (let i = 0; i < catalog.challenges.length; i += 1) {
      const challenge = catalog.challenges[i];
      expect(challenge.id.length).toBeGreaterThan(0);
      expect(challenge.startingPins.length).toBeGreaterThan(0);
      expect(challenge.rollLimit).toBeGreaterThan(0);
    }
  });

  it('evaluates strike streak and split conversion goals', () => {
    const catalog = loadBowlingChallenges();
    const streak = catalog.challenges.find((entry) => entry.goal.type === 'strike_streak');
    const split = catalog.challenges.find((entry) => entry.goal.type === 'split_convert');

    expect(streak).toBeTruthy();
    expect(split).toBeTruthy();

    if (!streak || !split) return;

    const streakPass = evaluateChallenge(streak, {
      rollsUsed: 2,
      strikeStreakMax: 3,
      sparesInWindow: 0,
      totalPinsKnocked: 20,
      score: 30,
      splitConverted: { '7-10': 0, bucket: 0 }
    });

    const splitFail = evaluateChallenge(split, {
      rollsUsed: split.rollLimit,
      strikeStreakMax: 0,
      sparesInWindow: 0,
      totalPinsKnocked: 0,
      score: 0,
      splitConverted: { '7-10': 0, bucket: 0 }
    });

    expect(streakPass.passed).toBe(true);
    expect(splitFail.failed).toBe(true);
  });
});
