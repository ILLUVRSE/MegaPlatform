import { describe, expect, it } from 'vitest';
import { createInitialProfile } from '../rules';
import { loadItemsCatalog } from '../economy/inventory';
import { deriveShipStats } from '../economy/fitting';
import { canUnlockHull, ensureHullState, equipModuleForHull, loadHullCatalog, purchaseHull, switchHull } from './hulls';

describe('starlight hull model', () => {
  it('validates hull content schema and class coverage', () => {
    const hulls = loadHullCatalog();
    expect(hulls.hulls.length).toBeGreaterThanOrEqual(6);
    const classes = new Set(hulls.hulls.map((h) => h.class));
    expect(classes.has('Scout')).toBe(true);
    expect(classes.has('Frigate')).toBe(true);
    expect(classes.has('Freighter')).toBe(true);
    expect(classes.has('Interceptor')).toBe(true);
    expect(classes.has('Science Vessel')).toBe(true);
    expect(classes.has('Gunship')).toBe(true);
  });

  it('switching hull changes derived stats and keeps per-hull loadouts', () => {
    const hulls = loadHullCatalog();
    const items = loadItemsCatalog();
    let profile = ensureHullState(createInitialProfile(701), hulls, items.modules);
    profile = {
      ...profile,
      inventory: {
        ...profile.inventory,
        credits: 999,
        modules: [...profile.inventory.modules, 'burst-laser', 'reactive-shield', 'survey-booster']
      }
    };

    const scout = hulls.hulls.find((h) => h.class === 'Scout');
    if (!scout) throw new Error('missing scout');
    profile = purchaseHull(profile, scout);
    profile = switchHull(profile, hulls, items.modules, scout.id);
    profile = equipModuleForHull(profile, hulls, items.modules, 'survey-booster', 'utility');

    profile = switchHull(profile, hulls, items.modules, 'pathfinder-frigate');
    profile = equipModuleForHull(profile, hulls, items.modules, 'burst-laser', 'weapon');
    profile = switchHull(profile, hulls, items.modules, scout.id);

    const statsScout = deriveShipStats(profile, items.modules, hulls);
    profile = switchHull(profile, hulls, items.modules, 'pathfinder-frigate');
    const statsFrigate = deriveShipStats(profile, items.modules, hulls);

    expect(statsScout.moveSpeed).not.toBe(statsFrigate.moveSpeed);
    expect(profile.hullLoadouts[scout.id].utility.includes('survey-booster')).toBe(true);
  });

  it('purchase requires requirements and reduces credits', () => {
    const hulls = loadHullCatalog();
    const target = hulls.hulls.find((h) => h.unlock.type === 'credits');
    if (!target) throw new Error('missing credits hull');

    let profile = createInitialProfile(702);
    expect(canUnlockHull(profile, target)).toBe(false);
    const blocked = purchaseHull(profile, target);
    expect(blocked.ownedHullIds.includes(target.id)).toBe(false);
    profile = { ...profile, inventory: { ...profile.inventory, credits: 999 } };
    expect(canUnlockHull(profile, target)).toBe(true);

    const next = purchaseHull(profile, target);
    expect(next.ownedHullIds.includes(target.id)).toBe(true);
    expect(next.inventory.credits).toBe(profile.inventory.credits - (target.unlock.credits ?? 0));
  });

  it('overflow handling trims to hull slots deterministically', () => {
    const hulls = loadHullCatalog();
    const items = loadItemsCatalog();
    let profile = ensureHullState(createInitialProfile(703), hulls, items.modules);
    profile = { ...profile, hullLoadouts: { ...profile.hullLoadouts, 'pathfinder-frigate': { weapon: ['burst-laser', 'ion-blaster'], shield: [], utility: [] } } };
    profile = ensureHullState(profile, hulls, items.modules);
    const loadout = profile.hullLoadouts['pathfinder-frigate'];
    expect(loadout.weapon.length).toBe(1);
    expect(loadout.weapon[0]).toBe('burst-laser');
  });
});
