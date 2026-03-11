import { describe, expect, it } from 'vitest';
import { createInitialProfile } from '../rules';
import { loadUniverse } from '../world/universe';
import { computeFrontlineState } from '../world/frontline';
import { addCargo, cargoFree, loadGoodsCatalog } from './goods';
import { computeGoodPrice, computeSystemPrices, loadMarketShocks, selectWeeklyShockIds } from './marketSim';

describe('starlight market sim', () => {
  it('prices are deterministic for same system and day key', () => {
    const profile = createInitialProfile(77);
    const universe = loadUniverse();
    const goods = loadGoodsCatalog();
    const shocks = loadMarketShocks();
    const frontline = computeFrontlineState(universe, profile.seedBase, '2026-W07');
    const system = universe.systems[0];

    const a = computeSystemPrices(profile, system, goods, shocks, frontline, new Date(Date.UTC(2026, 1, 15)));
    const b = computeSystemPrices(profile, system, goods, shocks, frontline, new Date(Date.UTC(2026, 1, 15)));
    expect(a).toEqual(b);
  });

  it('weekly shock selection is deterministic', () => {
    const shocks = loadMarketShocks();
    const a = selectWeeklyShockIds('2026-W08', 101, shocks, 2);
    const b = selectWeeklyShockIds('2026-W08', 101, shocks, 2);
    expect(a).toEqual(b);
  });

  it('contraband pricing differs from legal goods in safe systems', () => {
    const profile = createInitialProfile(88);
    const universe = loadUniverse();
    const goods = loadGoodsCatalog();
    const shocks = loadMarketShocks();
    const frontline = computeFrontlineState(universe, profile.seedBase, '2026-W07');
    const safeSystem = universe.systems.find((system) => system.security === 'SAFE') ?? universe.systems[0];
    const legal = goods.goods.find((good) => good.legality === 'legal') ?? goods.goods[0];
    const contraband = goods.goods.find((good) => good.legality === 'contraband') ?? goods.goods[1];
    const shockIds = selectWeeklyShockIds('2026-W07', profile.seedBase, shocks, 2);

    const legalPrice = computeGoodPrice(
      { profileSeed: profile.seedBase, dayKey: '2026-02-15', weekKey: '2026-W07', system: safeSystem, good: legal, activeShockIds: shockIds, frontline },
      shocks
    );
    const illegalPrice = computeGoodPrice(
      { profileSeed: profile.seedBase, dayKey: '2026-02-15', weekKey: '2026-W07', system: safeSystem, good: contraband, activeShockIds: shockIds, frontline },
      shocks
    );

    expect(illegalPrice).toBeGreaterThan(legalPrice);
  });

  it('enforces cargo capacity when buying goods', () => {
    const goods = loadGoodsCatalog();
    let profile = createInitialProfile(99);
    const first = goods.goods[0];

    for (let i = 0; i < 100; i += 1) {
      profile = addCargo(profile, goods, first.id, 1, first.basePrice);
    }

    expect(cargoFree(profile, goods)).toBe(0);
  });
});
