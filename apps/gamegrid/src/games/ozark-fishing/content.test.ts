import { describe, expect, it } from 'vitest';
import { loadCosmeticsCatalog, loadFishVisualCatalog, loadGearCatalog, loadSpotCatalog } from './content';
import { loadEnvironmentDefinition, resolveLakeZone, zoneSpawnWeight } from './environment';
import { loadFishCatalog } from './fish';
import { loadLureCatalog } from './rules';

describe('ozark fishing content validation', () => {
  it('loads fish/lure/gear/spots/environment with expanded structure', () => {
    const fish = loadFishCatalog();
    const lures = loadLureCatalog();
    const env = loadEnvironmentDefinition();
    const spots = loadSpotCatalog();
    const gear = loadGearCatalog();
    const fishVisuals = loadFishVisualCatalog();
    const cosmetics = loadCosmeticsCatalog();

    expect(fish.length).toBeGreaterThanOrEqual(25);
    expect(fish.some((entry) => entry.name === 'Ozark Muskie' && entry.rarityTier === 'Legendary')).toBe(true);
    expect(fish.every((entry) => entry.weightCurve.p10 <= entry.weightCurve.p50 && entry.weightCurve.p50 <= entry.weightCurve.p90)).toBe(true);

    const rarityCounts = fish.reduce(
      (acc, item) => {
        acc[item.rarityTier] += 1;
        return acc;
      },
      { Common: 0, Uncommon: 0, Rare: 0, Legendary: 0 }
    );
    expect(rarityCounts.Common).toBeGreaterThan(0);
    expect(rarityCounts.Uncommon).toBeGreaterThan(0);
    expect(rarityCounts.Rare).toBeGreaterThan(0);

    expect(lures.length).toBeGreaterThanOrEqual(20);
    expect(lures.every((entry) => entry.detectability > 0)).toBe(true);

    expect(spots.length).toBeGreaterThanOrEqual(4);
    expect(spots.some((spot) => spot.id === 'cove')).toBe(true);
    expect(spots.some((spot) => spot.id === 'dock')).toBe(true);
    expect(spots.some((spot) => spot.id === 'open-water')).toBe(true);
    expect(spots.some((spot) => spot.id === 'river-mouth')).toBe(true);

    expect(gear.rods.length).toBeGreaterThanOrEqual(5);
    expect(gear.reels.length).toBeGreaterThanOrEqual(5);
    expect(gear.lines.length).toBeGreaterThanOrEqual(4);
    expect(Object.keys(fishVisuals).length).toBeGreaterThanOrEqual(25);
    expect(cosmetics.bobberSkins.length).toBeGreaterThanOrEqual(10);
    expect(cosmetics.lureSkins.length).toBeGreaterThanOrEqual(15);

    expect(env.baseBiteChancePerSecond).toBeGreaterThan(0);
    expect(env.weatherMultipliers.light_rain).toBeGreaterThan(env.weatherMultipliers.sunny);
    expect(env.depthBands.shallowMax).toBeLessThan(env.depthBands.midMax);

    expect(resolveLakeZone(0.1, env)).toBe('shoreline');
    expect(resolveLakeZone(0.3, env)).toBe('weed_bed');
    expect(resolveLakeZone(0.9, env)).toBe('deep_dropoff');
  });

  it('spot selection influences spawn weighting', () => {
    const env = loadEnvironmentDefinition();
    const spots = loadSpotCatalog();

    const cove = spots.find((spot) => spot.id === 'cove');
    const openWater = spots.find((spot) => spot.id === 'open-water');
    expect(cove).toBeTruthy();
    expect(openWater).toBeTruthy();
    if (!cove || !openWater) return;

    const bassInCove = zoneSpawnWeight(env, 'weed_bed', 'largemouth-bass', cove);
    const bassInOpen = zoneSpawnWeight(env, 'weed_bed', 'largemouth-bass', openWater);
    expect(bassInCove).toBeGreaterThan(bassInOpen);
  });
});
