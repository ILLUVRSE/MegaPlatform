import { describe, expect, it } from 'vitest';
import { applySeasonSessionRecord, createDefaultProgression } from './progression';

describe('ozark season standings', () => {
  it('updates standings and unlocks cosmetic rewards at thresholds', () => {
    let state = createDefaultProgression();

    state = applySeasonSessionRecord(state, {
      seasonId: 'winter',
      weekKey: '2026-W07',
      mode: 'timed_derby',
      bestDerbyWeightLb: 42,
      bestBigCatchLb: 18,
      raresCaught: 5
    });

    state = applySeasonSessionRecord(state, {
      seasonId: 'winter',
      weekKey: '2026-W08',
      mode: 'big_catch',
      bestDerbyWeightLb: 12,
      bestBigCatchLb: 21,
      raresCaught: 4
    });

    const winter = state.seasons.find((s) => s.seasonId === 'winter');
    expect(winter).toBeTruthy();
    if (!winter) return;

    expect(winter.weeklyRecords.length).toBe(2);
    expect(winter.earnedRewards.some((r) => r.startsWith('title:'))).toBe(true);
    expect(winter.earnedRewards.some((r) => r.startsWith('frame:'))).toBe(true);
    expect(winter.earnedRewards.some((r) => r.startsWith('skin:'))).toBe(true);
  });

  it('cosmetic rewards do not alter gameplay-affecting progression values', () => {
    const base = createDefaultProgression();
    const next = applySeasonSessionRecord(base, {
      seasonId: 'spring',
      weekKey: '2026-W10',
      mode: 'timed_derby',
      bestDerbyWeightLb: 50,
      bestBigCatchLb: 24,
      raresCaught: 10
    });

    expect(next.xp).toBe(base.xp);
    expect(next.level).toBe(base.level);
    expect(next.rodsUnlocked).toBe(base.rodsUnlocked);
    expect(next.reelsUnlocked).toBe(base.reelsUnlocked);
    expect(next.linesUnlocked).toBe(base.linesUnlocked);
    expect(next.luresUnlocked).toBe(base.luresUnlocked);
  });
});
