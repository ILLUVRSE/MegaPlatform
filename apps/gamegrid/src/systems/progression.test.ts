import { describe, expect, it } from 'vitest';
import { applyGameEndToStats, levelFromXp, normalizePortalStats } from './progression';

describe('progression', () => {
  it('normalizes legacy stats shape safely', () => {
    const normalized = normalizePortalStats({
      lastPlayed: 'pool',
      perGame: {
        pool: { plays: 2, bestScore: 8, lastScore: 4 }
      }
    });

    expect(normalized.perGame.pool.wins).toBe(0);
    expect(normalized.level).toBe(1);
    expect(normalized.totalPlays).toBe(0);
  });

  it('applies a game_end event to aggregate stats', () => {
    const baseline = normalizePortalStats({});
    const updated = applyGameEndToStats(baseline, 'pool', { score: 180, winner: 'player' }, Date.UTC(2026, 1, 15));

    expect(updated.next.perGame.pool.plays).toBe(1);
    expect(updated.next.perGame.pool.bestScore).toBe(180);
    expect(updated.next.perGame.pool.wins).toBe(1);
    expect(updated.next.totalPlays).toBe(1);
    expect(updated.next.totalWins).toBe(1);
    expect(updated.next.dailyStreak).toBe(1);
    expect(updated.xpGained).toBeGreaterThan(40);
    expect(updated.next.unlockedTitles).toContain('rookie');
  });

  it('increments streak on consecutive days and resets after a gap', () => {
    const dayOne = applyGameEndToStats(normalizePortalStats({}), 'pool', { score: 5 }, Date.UTC(2026, 1, 15));
    const dayTwo = applyGameEndToStats(dayOne.next, 'pool', { score: 5 }, Date.UTC(2026, 1, 16));
    const dayFive = applyGameEndToStats(dayTwo.next, 'pool', { score: 5 }, Date.UTC(2026, 1, 19));

    expect(dayTwo.next.dailyStreak).toBe(2);
    expect(dayTwo.next.longestStreak).toBe(2);
    expect(dayFive.next.dailyStreak).toBe(1);
    expect(dayFive.next.longestStreak).toBe(2);
  });

  it('levels up as xp accumulates', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(120)).toBe(2);
    expect(levelFromXp(10000)).toBeGreaterThan(5);
  });
});
