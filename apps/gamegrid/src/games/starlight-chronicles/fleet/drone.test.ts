import { describe, expect, it } from 'vitest';
import { createInitialProfile } from '../rules';
import { applyPostCombatDroneRepair, assignDrone, droneDerivedBonuses, loadDrones, unlockDrone } from './drone';

describe('starlight drones', () => {
  it('loads schema and minimum count', () => {
    const catalog = loadDrones();
    expect(catalog.drones.length).toBeGreaterThanOrEqual(6);
  });

  it('applies deterministic effect bonuses from active drone', () => {
    const catalog = loadDrones();
    let profile = createInitialProfile(2101);
    profile = unlockDrone(profile, 'smuggler-wisp');
    profile = assignDrone(profile, 'smuggler-wisp');
    const a = droneDerivedBonuses(profile, catalog);
    const b = droneDerivedBonuses(profile, catalog);
    expect(a).toEqual(b);
    expect(a.smugglerReduction).toBeGreaterThan(0);
  });

  it('post-combat repair does not break hull constraints', () => {
    const catalog = loadDrones();
    const profile = {
      ...createInitialProfile(2102),
      shipCondition: 96,
      shipDamage: {
        ...createInitialProfile(2102).shipDamage,
        hullIntegrity: 96
      }
    };
    const repaired = applyPostCombatDroneRepair(profile, catalog);
    expect(repaired.shipCondition).toBeLessThanOrEqual(100);
    expect(repaired.shipDamage.hullIntegrity).toBeLessThanOrEqual(100);
  });
});
