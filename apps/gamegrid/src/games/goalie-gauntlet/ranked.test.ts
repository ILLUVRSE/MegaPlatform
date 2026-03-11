import { describe, expect, it } from 'vitest';
import { loadShotPatterns } from './patterns';
import { buildRankedSchedule, createRankedRun, resolveRankTier } from './ranked';

describe('goalie-gauntlet ranked deterministic daily seed', () => {
  it('builds identical ranked round definitions for same UTC day key', () => {
    const catalog = loadShotPatterns();
    const dayKey = '2026-02-15';

    const first = createRankedRun(catalog, dayKey);
    const second = createRankedRun(catalog, dayKey);

    expect(first.seed).toBe(second.seed);
    expect(first.rounds).toEqual(second.rounds);
    expect(first.rounds).toHaveLength(10);
  });

  it('builds deterministic ranked shot schedule and tier mapping', () => {
    const catalog = loadShotPatterns();
    const dayKey = '2026-02-15';

    const first = buildRankedSchedule(catalog, dayKey);
    const second = buildRankedSchedule(catalog, dayKey);

    expect(first.patternId).toBe(`ranked:${dayKey}`);
    expect(first.shots[0]).toEqual(second.shots[0]);
    expect(first.shots[10]).toEqual(second.shots[10]);
    expect(resolveRankTier(14000)).toBe('Legendary');
    expect(resolveRankTier(3500)).toBe('Bronze');
  });
});
