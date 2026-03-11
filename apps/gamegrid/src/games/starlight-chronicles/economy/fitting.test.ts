import { describe, expect, it } from 'vitest';
import { createInitialProfile } from '../rules';
import { loadItemsCatalog } from './inventory';
import { deriveShipStats, equipModule } from './fitting';

describe('starlight economy fitting', () => {
  it('equipping module modifies derived stats', () => {
    const items = loadItemsCatalog();
    let profile = createInitialProfile(11);

    profile = {
      ...profile,
      inventory: {
        ...profile.inventory,
        modules: ['burst-laser', 'reactive-shield', 'survey-booster']
      }
    };

    profile = equipModule(profile, 'burst-laser', 'weapon');
    profile = equipModule(profile, 'reactive-shield', 'shield');
    profile = equipModule(profile, 'survey-booster', 'utility');

    const stats = deriveShipStats(profile, items.modules);

    expect(stats.bulletDamage).toBeGreaterThan(12);
    expect(stats.maxShield).toBeGreaterThan(40);
    expect(stats.scanRateMultiplier).toBeGreaterThan(1);
  });
});
