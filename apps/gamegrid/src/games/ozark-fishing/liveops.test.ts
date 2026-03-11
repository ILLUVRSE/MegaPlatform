import { describe, expect, it } from 'vitest';
import {
  deterministicSighting,
  eligibleLegendaries,
  getSeasonForDate,
  isIceFishingAvailable,
  isoWeekKey,
  jigPatternInfluence,
  loadLegendaryRules,
  loadSeasonCatalog,
  loadWeeklyEvents,
  pickWeeklyEvent,
  spawnWeightWithSeasonEvent
} from './liveops';

describe('ozark liveops', () => {
  it('maps seasons correctly for known UTC dates', () => {
    const catalog = loadSeasonCatalog();
    expect(getSeasonForDate(new Date(Date.UTC(2026, 0, 15)), catalog).id).toBe('winter');
    expect(getSeasonForDate(new Date(Date.UTC(2026, 3, 15)), catalog).id).toBe('spring');
    expect(getSeasonForDate(new Date(Date.UTC(2026, 6, 15)), catalog).id).toBe('summer');
    expect(getSeasonForDate(new Date(Date.UTC(2026, 9, 15)), catalog).id).toBe('fall');
  });

  it('season and event modifiers apply deterministically to spawn weights', () => {
    const season = loadSeasonCatalog().seasons.find((s) => s.id === 'winter');
    const event = loadWeeklyEvents().find((e) => e.id === 'deep-drop-legends');
    expect(season).toBeTruthy();
    expect(event).toBeTruthy();
    if (!season || !event) return;

    const a = spawnWeightWithSeasonEvent(1, 'walleye', 'deep_dropoff', season, event);
    const b = spawnWeightWithSeasonEvent(1, 'bluegill', 'shoreline', season, event);
    expect(a).toBeGreaterThan(b);
  });

  it('weekly event selection is deterministic by ISO week key', () => {
    const events = loadWeeklyEvents();
    const week = isoWeekKey(new Date(Date.UTC(2026, 1, 15)));
    const a = pickWeeklyEvent(week, events, 0);
    const b = pickWeeklyEvent(week, events, 0);
    const c = pickWeeklyEvent('2026-W08', events, 0);
    expect(a.id).toBe(b.id);
    expect(c.id).not.toBe('');
  });

  it('ice mode gating and jig weighting behave correctly', () => {
    expect(isIceFishingAvailable('winter', false)).toBe(true);
    expect(isIceFishingAvailable('summer', false)).toBe(false);
    expect(isIceFishingAvailable('summer', true)).toBe(true);

    const rhythmic = jigPatternInfluence([420, 430, 425, 418]);
    const erratic = jigPatternInfluence([100, 900, 140, 760]);
    expect(rhythmic).toBeGreaterThan(erratic);
  });

  it('legendary eligibility and sightings are deterministic', () => {
    const rules = loadLegendaryRules();
    const eligible = eligibleLegendaries(rules, 'winter', 'deep-drop-legends');
    expect(eligible.some((r) => r.legendaryId === 'ozark-muskie')).toBe(true);

    const hintA = deterministicSighting('2026-W07', 77, eligible);
    const hintB = deterministicSighting('2026-W07', 77, eligible);
    expect(hintA).toEqual(hintB);
  });
});
