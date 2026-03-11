import { describe, expect, it } from 'vitest';
import { createInitialProfile } from '../rules';
import { loadUniverse } from '../world/universe';
import { loadGoodsCatalog } from './goods';
import { generateContractsForSystem, pruneExpiredContracts, resolveDeliveredContracts } from './contracts';

describe('starlight contracts', () => {
  it('generates deterministic contracts', () => {
    const universe = loadUniverse();
    const goods = loadGoodsCatalog();
    const profile = createInitialProfile(123);

    const a = generateContractsForSystem(universe, goods, profile, 'solace-anchor', '2026-02-15', 3);
    const b = generateContractsForSystem(universe, goods, profile, 'solace-anchor', '2026-02-15', 3);
    expect(a).toEqual(b);
  });

  it('resolves delivered contracts at destination and grants payout', () => {
    const universe = loadUniverse();
    const goods = loadGoodsCatalog();
    let profile = createInitialProfile(124);
    const contract = generateContractsForSystem(universe, goods, profile, profile.currentSystemId, '2026-02-15', 1)[0];

    profile = {
      ...profile,
      currentSystemId: contract.destinationSystemId,
      activeContracts: [contract],
      cargo: {
        [contract.goodId]: {
          qty: contract.quantity,
          avgPrice: 10
        }
      }
    };

    const resolved = resolveDeliveredContracts(profile, '2026-02-16');
    expect(resolved.delivered.length).toBe(1);
    expect(resolved.profile.inventory.credits).toBeGreaterThan(profile.inventory.credits);
    expect(resolved.profile.activeContracts.length).toBe(0);
  });

  it('prunes expired contracts by day key', () => {
    const universe = loadUniverse();
    const goods = loadGoodsCatalog();
    const profile = createInitialProfile(125);
    const contract = generateContractsForSystem(universe, goods, profile, profile.currentSystemId, '2026-02-01', 1)[0];

    const kept = pruneExpiredContracts([contract], contract.expiryDayKey);
    const pruned = pruneExpiredContracts([contract], '2099-01-01');

    expect(kept.length).toBe(1);
    expect(pruned.length).toBe(0);
  });
});
