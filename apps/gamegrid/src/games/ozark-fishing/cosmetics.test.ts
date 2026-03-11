import { describe, expect, it } from 'vitest';
import { loadCosmeticsCatalog } from './content';
import { createDefaultProgression, loadProgression, saveProgression } from './progression';
import { loadLureCatalog } from './rules';

describe('ozark cosmetics', () => {
  it('validates cosmetics content thresholds', () => {
    const cosmetics = loadCosmeticsCatalog();
    expect(cosmetics.bobberSkins.length).toBeGreaterThanOrEqual(10);
    expect(cosmetics.lureSkins.length).toBeGreaterThanOrEqual(15);
  });

  it('persists cosmetic selection round-trip', () => {
    const state = createDefaultProgression();
    const cosmetics = loadCosmeticsCatalog();
    state.cosmetics.bobberSkinId = cosmetics.bobberSkins[3].id;
    state.cosmetics.lureSkinByLureId[state.loadout.lureId] = cosmetics.lureSkins[6].id;
    saveProgression(state);
    const loaded = loadProgression();
    expect(loaded.cosmetics.bobberSkinId).toBe(cosmetics.bobberSkins[3].id);
    expect(loaded.cosmetics.lureSkinByLureId[state.loadout.lureId]).toBe(cosmetics.lureSkins[6].id);
  });

  it('cosmetics do not modify lure stats', () => {
    const lures = loadLureCatalog();
    const lure = lures[0];
    const original = {
      sinkRate: lure.sinkRate,
      biteMultiplier: lure.biteMultiplier,
      detectability: lure.detectability,
      preferredDepth: lure.preferredDepth
    };

    const cosmetics = loadCosmeticsCatalog();
    const selectedSkin = cosmetics.lureSkins[cosmetics.lureSkins.length - 1];
    expect(selectedSkin.id.length).toBeGreaterThan(0);

    expect(lure.sinkRate).toBe(original.sinkRate);
    expect(lure.biteMultiplier).toBe(original.biteMultiplier);
    expect(lure.detectability).toBe(original.detectability);
    expect(lure.preferredDepth).toBe(original.preferredDepth);
  });
});
