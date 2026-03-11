import { describe, expect, it } from 'vitest';
import { createInitialProfile } from '../rules';
import { loadItemsCatalog, repairShip } from '../economy/inventory';
import { deriveShipStats } from '../economy/fitting';
import {
  applyDeterministicDamageRoll,
  applySystemDamage,
  createInitialShipDamageState,
  deterministicDamageSystem,
  fieldRepairSystem
} from './shipDamage';

describe('starlight ship damage states', () => {
  it('applies deterministic system damage rolls', () => {
    const state = createInitialShipDamageState(80);
    const a = applyDeterministicDamageRoll(state, 111, 'n-2-1', 3, 'combat-hit', 1);
    const b = applyDeterministicDamageRoll(state, 111, 'n-2-1', 3, 'combat-hit', 1);
    expect(a).toEqual(b);
    expect(deterministicDamageSystem(111, 'n-2-1', 3, 'combat-hit')).toBe(deterministicDamageSystem(111, 'n-2-1', 3, 'combat-hit'));
  });

  it('repairs reduce damage correctly including field repair', () => {
    const damaged = applySystemDamage(applySystemDamage(createInitialShipDamageState(62), 'engines', 2), 'weapons', 1);
    const repaired = fieldRepairSystem(damaged, 77, 'n-1-0', 0);
    const beforeSum = damaged.systems.engines + damaged.systems.weapons + damaged.systems.sensors;
    const afterSum = repaired.systems.engines + repaired.systems.weapons + repaired.systems.sensors;
    expect(afterSum).toBe(beforeSum - 1);

    const profile = createInitialProfile(4);
    const repairedProfile = repairShip(
      {
        ...profile,
        shipDamage: damaged,
        shipCondition: damaged.hullIntegrity,
        inventory: { ...profile.inventory, credits: 999 }
      },
      40,
      15,
      10
    );
    expect(repairedProfile.shipDamage.hullIntegrity).toBeGreaterThan(damaged.hullIntegrity);
    expect(repairedProfile.shipDamage.systems.engines).toBeLessThanOrEqual(damaged.systems.engines);
  });

  it('damage effects impact derived stats', () => {
    const items = loadItemsCatalog();
    const profile = createInitialProfile(19);
    const clean = deriveShipStats(profile, items.modules);

    const damagedProfile = {
      ...profile,
      shipDamage: {
        ...profile.shipDamage,
        systems: {
          engines: 2,
          weapons: 2,
          sensors: 2
        }
      }
    };
    const damaged = deriveShipStats(damagedProfile, items.modules);
    expect(damaged.moveSpeed).toBeLessThan(clean.moveSpeed);
    expect(damaged.fireIntervalMs).toBeGreaterThan(clean.fireIntervalMs);
    expect(damaged.scanRateMultiplier).toBeLessThan(clean.scanRateMultiplier);
  });
});
