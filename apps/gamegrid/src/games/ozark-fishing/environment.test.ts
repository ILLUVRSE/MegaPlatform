import { describe, expect, it } from 'vitest';
import { loadSpotCatalog } from './content';
import { loadEnvironmentDefinition, resolveLakeZone, zoneSpawnWeight } from './environment';

describe('ozark fishing environment weighting', () => {
  it('resolves zone buckets correctly', () => {
    const env = loadEnvironmentDefinition();
    expect(resolveLakeZone(0.05, env)).toBe('shoreline');
    expect(resolveLakeZone(0.31, env)).toBe('weed_bed');
    expect(resolveLakeZone(0.55, env)).toBe('open_water');
    expect(resolveLakeZone(0.9, env)).toBe('deep_dropoff');
  });

  it('applies fish preferences and spot boosts over base zone weights', () => {
    const env = loadEnvironmentDefinition();
    const spot = loadSpotCatalog().find((entry) => entry.id === 'open-water');
    expect(spot).toBeTruthy();
    if (!spot) return;

    const muskieDeep = zoneSpawnWeight(env, 'deep_dropoff', 'ozark-muskie', spot);
    const muskieShore = zoneSpawnWeight(env, 'shoreline', 'ozark-muskie', spot);

    expect(muskieDeep).toBeGreaterThan(muskieShore);
  });
});
