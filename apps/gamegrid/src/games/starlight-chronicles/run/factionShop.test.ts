import { describe, expect, it } from 'vitest';
import { createInitialProfile } from '../rules';
import { loadItemsCatalog } from '../economy/inventory';
import { resolveShopInventory, shopPriceWithFaction } from './nodeResolvers';

describe('starlight faction shop effects', () => {
  it('same seed and node produce deterministic shop inventory', () => {
    const items = loadItemsCatalog();
    const profile = createInitialProfile(22);
    const a = resolveShopInventory(items, 9999, 'n-2-1', profile);
    const b = resolveShopInventory(items, 9999, 'n-2-1', profile);
    expect(a).toEqual(b);
  });

  it('prices change with faction standing', () => {
    const low = createInitialProfile(1);
    const high = {
      ...low,
      factions: {
        ...low.factions,
        freebelt: 8
      }
    };

    const base = 100;
    expect(shopPriceWithFaction(base, high, 'freebelt')).toBeLessThan(shopPriceWithFaction(base, low, 'freebelt'));
  });
});
