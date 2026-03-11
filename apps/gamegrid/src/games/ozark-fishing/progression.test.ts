import { describe, expect, it } from 'vitest';
import {
  applyCatchProgress,
  challengeSeedForDateKey,
  createDefaultProgression,
  generateDailyChallenges,
  getUnlocksForLevel
} from './progression';

describe('ozark fishing progression', () => {
  it('awards xp, unlocks gear, and tracks species PB + lifetime weight', () => {
    let state = createDefaultProgression();

    state = applyCatchProgress(state, {
      fishId: 'channel-catfish',
      fishName: 'Channel Catfish',
      weightLb: 14,
      xp: 420,
      rarityTier: 'Rare',
      timestamp: Date.now(),
      spotId: 'open-water',
      weather: 'light_rain',
      timeOfDay: 'night'
    });

    state = applyCatchProgress(state, {
      fishId: 'channel-catfish',
      fishName: 'Channel Catfish',
      weightLb: 11,
      xp: 80,
      rarityTier: 'Uncommon',
      timestamp: Date.now() + 1,
      spotId: 'river-mouth',
      weather: 'overcast',
      timeOfDay: 'day'
    });

    expect(state.level).toBeGreaterThanOrEqual(4);
    const unlocks = getUnlocksForLevel(state.level);
    expect(state.rodsUnlocked).toBe(unlocks.rodsUnlocked);
    expect(state.reelsUnlocked).toBe(unlocks.reelsUnlocked);
    expect(state.linesUnlocked).toBe(unlocks.linesUnlocked);
    expect(state.luresUnlocked).toBe(unlocks.luresUnlocked);

    expect(state.personalBestBySpecies['channel-catfish']).toBe(14);
    expect(state.lifetimeWeightLb).toBeCloseTo(25, 4);
  });

  it('updates trophy book persistence fields when catches are recorded', () => {
    let state = createDefaultProgression();

    state = applyCatchProgress(state, {
      fishId: 'walleye',
      fishName: 'Walleye',
      weightLb: 6.4,
      xp: 120,
      rarityTier: 'Rare',
      timestamp: Date.now(),
      spotId: 'dock',
      weather: 'overcast',
      timeOfDay: 'night'
    });

    state = applyCatchProgress(state, {
      fishId: 'walleye',
      fishName: 'Walleye',
      weightLb: 7.1,
      xp: 120,
      rarityTier: 'Rare',
      timestamp: Date.now() + 1,
      spotId: 'open-water',
      weather: 'light_rain',
      timeOfDay: 'night'
    });

    const trophy = state.trophies['walleye'];
    expect(trophy).toBeTruthy();
    if (!trophy) return;

    expect(trophy.countCaught).toBe(2);
    expect(trophy.bestWeightLb).toBeCloseTo(7.1, 4);
    expect(trophy.caughtSpots).toContain('dock');
    expect(trophy.caughtSpots).toContain('open-water');
    expect(trophy.caughtWeather).toContain('light_rain');
  });

  it('generates deterministic daily challenges by date seed', () => {
    const dateKey = '2026-02-15';
    const seed = challengeSeedForDateKey(dateKey);

    const a = generateDailyChallenges(dateKey, seed);
    const b = generateDailyChallenges(dateKey, seed);
    const c = generateDailyChallenges('2026-02-16', challengeSeedForDateKey('2026-02-16'));

    expect(a).toEqual(b);
    expect(c).not.toEqual(a);
    expect(a.length).toBe(3);
  });
});
