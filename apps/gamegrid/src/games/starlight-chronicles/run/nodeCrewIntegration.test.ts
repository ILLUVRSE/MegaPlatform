import { describe, expect, it } from 'vitest';
import { createInitialProfile } from '../rules';
import { loadItemsCatalog } from '../economy/inventory';
import { deriveShipStats } from '../economy/fitting';
import { applyIncomingDamage, createCombatShip } from '../combat/combatRules';
import { applyCrewExploreModifier, hasCaptainPersuadeBonus, resolveShopInventory } from './nodeResolvers';

describe('starlight node crew integration', () => {
  it('story unlock checks captain persuasion threshold', () => {
    expect(hasCaptainPersuadeBonus(9, 8)).toBe(true);
    expect(hasCaptainPersuadeBonus(5, 8)).toBe(false);
  });

  it('explore modifier softens penalty when science bonus is present', () => {
    const base = { shipCondition: -5, credits: 20 };
    const improved = applyCrewExploreModifier(base, 12);
    expect(improved.shipCondition).toBeGreaterThan(base.shipCondition);
  });

  it('shop resolver adds engineer bonuses to offers and repair discount', () => {
    const items = loadItemsCatalog();
    const profile = createInitialProfile(5);
    const normal = resolveShopInventory(items, 300, 'n-2-0', profile, 0);
    const boosted = resolveShopInventory(items, 300, 'n-2-0', profile, 10);
    expect(boosted.offers.length).toBeGreaterThanOrEqual(normal.offers.length);
    expect(boosted.repairDiscountPct).toBeGreaterThan(normal.repairDiscountPct);
  });

  it('combat bonus impacts damage and mitigation path', () => {
    const items = loadItemsCatalog();
    const profile = createInitialProfile(7);
    const stats = deriveShipStats(profile, items.modules);
    const ship = createCombatShip(stats);
    const hit = applyIncomingDamage(ship, 20, 0.15);
    expect(hit.shield).toBe(23);
  });
});
