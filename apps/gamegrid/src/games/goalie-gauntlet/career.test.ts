import { describe, expect, it } from 'vitest';
import { calculateSeasonRatingDelta, evaluateCareerObjective, generateCareerSeason, loadCareerCatalog, resolveSeasonLadderTier } from './career';

describe('goalie-gauntlet career season generation', () => {
  it('is deterministic for the same season key and profile seed', () => {
    const catalog = loadCareerCatalog();
    const seasonA = generateCareerSeason(catalog, '2026-W07', 9001);
    const seasonB = generateCareerSeason(catalog, '2026-W07', 9001);

    expect(seasonA.matches).toEqual(seasonB.matches);
    expect(seasonA.matches).toHaveLength(12);
    expect(seasonA.matches[11].isFinals).toBe(true);
  });

  it('evaluates objectives and rating deterministically', () => {
    expect(
      evaluateCareerObjective(
        { type: 'save_target', savesTarget: 10 },
        { saves: 11, goalsAllowed: 2, bestStreak: 4, alive: true }
      )
    ).toBe(true);
    expect(
      evaluateCareerObjective(
        { type: 'goals_under', maxGoals: 1 },
        { saves: 8, goalsAllowed: 2, bestStreak: 4, alive: true }
      )
    ).toBe(false);

    const delta = calculateSeasonRatingDelta({
      tier: 'gold',
      objectivePassed: true,
      goalsAllowed: 1,
      bestStreak: 6,
      perfectRate: 0.4,
      isFinals: false
    });

    expect(delta).toBeGreaterThan(150);
    expect(resolveSeasonLadderTier(2500)).toBe('All-Star');
  });
});
