import { describe, expect, it } from 'vitest';
import { buyCosmetic, equipCosmetic, loadCosmeticsCatalog } from './cosmetics';
import {
  applyRewardsToProgression,
  defaultProgressionProfile,
  loadGoalieProgression,
  recordCareerMatchResult,
  saveGoalieProgression
} from './progression';

describe('goalie-gauntlet progression persistence and store', () => {
  it('persists coins and career season progress', () => {
    let profile = defaultProgressionProfile();
    profile = applyRewardsToProgression(profile, { coins: 120, xp: 500 });
    profile = recordCareerMatchResult(profile, {
      seasonKey: '2026-W07',
      completedMatchesInSeason: 1,
      won: true,
      ratingDelta: 150,
      bestStreak: 5,
      score: 1400,
      seasonComplete: false
    });

    saveGoalieProgression(profile);
    const loaded = loadGoalieProgression();

    expect(loaded.coins).toBeGreaterThanOrEqual(120);
    expect(loaded.career.currentSeasonKey).toBe('2026-W07');
    expect(loaded.career.currentMatchIndex).toBe(1);
  });

  it('buying deducts coins and equipping persists', () => {
    const catalog = loadCosmeticsCatalog();
    let profile = defaultProgressionProfile();
    profile = { ...profile, coins: 600 };

    const target = catalog.items.find((item) => item.type === 'mask' && item.price > 0);
    expect(target).toBeTruthy();
    if (!target) return;

    const bought = buyCosmetic(profile, catalog, target.id);
    expect(bought.coins).toBe(profile.coins - target.price);
    expect(bought.unlockedCosmetics.includes(target.id)).toBe(true);

    const equipped = equipCosmetic(bought, catalog, target.id);
    expect(equipped.equippedCosmetics.mask).toBe(target.id);

    saveGoalieProgression(equipped);
    const loaded = loadGoalieProgression();
    expect(loaded.equippedCosmetics.mask).toBe(target.id);
  });
});
