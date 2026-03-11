import { describe, expect, it } from 'vitest';
import { buildShotSchedule, loadShotPatterns } from './patterns';

describe('goalie gauntlet pattern loader and deterministic generation', () => {
  it('loads pattern schema and emits deterministic schedules from seed', () => {
    const catalog = loadShotPatterns();
    expect(catalog.patterns.length).toBeGreaterThanOrEqual(4);

    const first = buildShotSchedule(catalog, {
      seed: 2026,
      mode: 'time_attack',
      difficulty: 'medium',
      patternId: 'balanced-core',
      durationMs: 60_000
    });

    const second = buildShotSchedule(catalog, {
      seed: 2026,
      mode: 'time_attack',
      difficulty: 'medium',
      patternId: 'balanced-core',
      durationMs: 60_000
    });

    expect(first.patternId).toBe('balanced-core');
    expect(first.shots.length).toBeGreaterThan(15);
    expect(first.shots[0]).toEqual(second.shots[0]);
    expect(first.shots[7]).toEqual(second.shots[7]);
    expect(first.shots.filter((shot) => shot.rebound).length).toBe(second.shots.filter((shot) => shot.rebound).length);
  });

  it('schedules deterministic rebound timings and fake shift metadata', () => {
    const catalog = loadShotPatterns();
    const schedule = buildShotSchedule(catalog, {
      seed: 9944,
      mode: 'challenge',
      difficulty: 'hard',
      patternId: 'deflection-drill',
      shotCount: 20
    });

    const rebound = schedule.shots.find((shot) => shot.rebound);
    expect(rebound).toBeTruthy();
    if (rebound) {
      const parent = schedule.shots.find((shot) => shot.id === rebound.reboundParentShotId);
      expect(parent).toBeTruthy();
      expect(rebound.spawnAtMs - (parent?.arriveAtMs ?? 0)).toBeGreaterThanOrEqual(300);
      expect(rebound.spawnAtMs - (parent?.arriveAtMs ?? 0)).toBeLessThanOrEqual(600);
    }

    const fake = schedule.shots.find((shot) => shot.fake);
    expect(fake?.fakeShiftAtMs ?? 0).toBeGreaterThan(0);
    expect(fake?.telegraphZone).not.toBe(fake?.realZone);
  });
});
