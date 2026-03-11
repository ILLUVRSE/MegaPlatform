import { describe, expect, it } from 'vitest';
import { createInitialProfile } from '../rules';
import { assignActiveWingmen, generateWingmanOffers, loadWingmen, recruitWingman } from './wingmen';

describe('starlight wingmen', () => {
  it('loads schema and minimum count', () => {
    const catalog = loadWingmen();
    expect(catalog.wingmen.length).toBeGreaterThanOrEqual(12);
    expect(catalog.wingmen.every((entry) => typeof entry.behavior.aggression === 'number')).toBe(true);
  });

  it('generates deterministic recruit offers by system/day', () => {
    const catalog = loadWingmen();
    const profile = createInitialProfile(2001);
    const a = generateWingmanOffers(catalog, profile, 'solace-anchor', '2026-02-15', 2).map((entry) => entry.id);
    const b = generateWingmanOffers(catalog, profile, 'solace-anchor', '2026-02-15', 2).map((entry) => entry.id);
    expect(a).toEqual(b);
  });

  it('persists active assignment and caps at two', () => {
    const catalog = loadWingmen();
    let profile = createInitialProfile(2002);
    profile = recruitWingman(profile, catalog.wingmen[0].id);
    profile = recruitWingman(profile, catalog.wingmen[1].id);
    profile = recruitWingman(profile, catalog.wingmen[2].id);
    const assigned = assignActiveWingmen(profile, [catalog.wingmen[0].id, catalog.wingmen[1].id, catalog.wingmen[2].id]);
    expect(assigned.activeWingmenIds.length).toBe(2);
    expect(assigned.activeWingmenIds).toEqual([catalog.wingmen[0].id, catalog.wingmen[1].id]);
  });
});
