import { describe, expect, it } from 'vitest';
import { createInitialProfile } from '../rules';
import { loadItemsCatalog } from '../economy/inventory';
import { deriveShipStats } from '../economy/fitting';
import { ensureHullState, loadHullCatalog } from './hulls';
import { applyHullCosmetic, ensureCosmetics, isCosmeticUnlocked, loadCosmeticsCatalog } from './cosmetics';

describe('starlight cosmetics', () => {
  it('loads cosmetics schema', () => {
    const catalog = loadCosmeticsCatalog();
    expect(catalog.skins.length).toBeGreaterThan(0);
    expect(catalog.decals.length).toBeGreaterThan(0);
    expect(catalog.trails.length).toBeGreaterThan(0);
  });

  it('cosmetics do not modify derived stats', () => {
    const hulls = loadHullCatalog();
    const cosmetics = loadCosmeticsCatalog();
    const items = loadItemsCatalog();
    let profile = ensureCosmetics(ensureHullState(createInitialProfile(710), hulls, items.modules), hulls, cosmetics);

    const before = deriveShipStats(profile, items.modules, hulls);
    profile = { ...profile, captainRank: 10, contractsCompleted: 10, lastSeenGalacticReportWeekKey: '2026-W07', factions: { concordium: 10, freebelt: 10, astral: 10 } };
    const skin = cosmetics.skins.find((entry) => isCosmeticUnlocked(profile, entry));
    if (!skin) throw new Error('missing unlocked skin');
    profile = applyHullCosmetic(profile, profile.activeHullId, 'skinKey', skin.id, cosmetics);
    const after = deriveShipStats(profile, items.modules, hulls);

    expect(after).toEqual(before);
  });

  it('selection persists per hull', () => {
    const hulls = loadHullCatalog();
    const cosmetics = loadCosmeticsCatalog();
    const items = loadItemsCatalog();
    let profile = ensureCosmetics(ensureHullState(createInitialProfile(711), hulls, items.modules), hulls, cosmetics);
    profile = { ...profile, captainRank: 10, contractsCompleted: 10, lastSeenGalacticReportWeekKey: '2026-W10', factions: { concordium: 10, freebelt: 10, astral: 10 } };

    const skin = cosmetics.skins[1];
    const next = applyHullCosmetic(profile, profile.activeHullId, 'skinKey', skin.id, cosmetics);
    expect(next.hullCosmetics[profile.activeHullId].skinKey).toBe(skin.id);
  });
});
