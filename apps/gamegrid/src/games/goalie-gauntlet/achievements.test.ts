import { describe, expect, it } from 'vitest';
import { evaluateAchievements, loadAchievementCatalog } from './achievements';

describe('goalie-gauntlet achievements', () => {
  it('triggers achievements once and returns badge set', () => {
    const catalog = loadAchievementCatalog();
    const first = evaluateAchievements(catalog, {}, {
      lifetimePerfectSaves: 30,
      lifetimeSaves: 1200,
      lifetimeReboundSaves: 25,
      rankedTier: 'Gold',
      matchGoalsAllowed: 0
    });

    expect(first.newlyUnlocked.length).toBeGreaterThanOrEqual(5);

    const second = evaluateAchievements(catalog, first.unlocked, {
      lifetimePerfectSaves: 45,
      lifetimeSaves: 1400,
      lifetimeReboundSaves: 40,
      rankedTier: 'Legendary',
      matchGoalsAllowed: 0
    });

    expect(second.newlyUnlocked).toHaveLength(0);
    expect(Object.keys(second.unlocked).length).toBeGreaterThanOrEqual(5);
  });
});
