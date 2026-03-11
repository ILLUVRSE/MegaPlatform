import { describe, expect, it } from 'vitest';
import { computeFrontlineState, generateGalacticReport } from './frontline';
import { loadUniverse } from './universe';
import { createInitialProfile } from '../rules';
import { loadGoodsCatalog } from '../economy/goods';
import { computeGoodPrice, loadMarketShocks, selectWeeklyShockIds } from '../economy/marketSim';

describe('starlight frontlines', () => {
  it('selection is deterministic for week key', () => {
    const universe = loadUniverse();
    const a = computeFrontlineState(universe, 41, '2026-W09');
    const b = computeFrontlineState(universe, 41, '2026-W09');
    expect(a).toEqual(b);
  });

  it('contested systems affect market price modifier', () => {
    const universe = loadUniverse();
    const profile = createInitialProfile(55);
    const goods = loadGoodsCatalog();
    const shocks = loadMarketShocks();
    const frontline = computeFrontlineState(universe, 55, '2026-W10');
    const contestedId = frontline.contestedSystemIds[0] ?? universe.systems[0].id;
    const contested = universe.systems.find((entry) => entry.id === contestedId) ?? universe.systems[0];
    const baseline = { ...frontline, contestedSystemIds: [] };
    const good = goods.goods[0];
    const shockIds = selectWeeklyShockIds('2026-W10', profile.seedBase, shocks, 2);

    const basePrice = computeGoodPrice(
      { profileSeed: profile.seedBase, dayKey: '2026-03-06', weekKey: '2026-W10', system: contested, good, activeShockIds: shockIds, frontline: baseline },
      shocks
    );
    const contestedPrice = computeGoodPrice(
      { profileSeed: profile.seedBase, dayKey: '2026-03-06', weekKey: '2026-W10', system: contested, good, activeShockIds: shockIds, frontline },
      shocks
    );

    expect(contestedPrice).toBeGreaterThanOrEqual(basePrice);
  });

  it('weekly report generation is stable', () => {
    const universe = loadUniverse();
    const a = generateGalacticReport(universe, 91, '2026-W11');
    const b = generateGalacticReport(universe, 91, '2026-W11');
    expect(a).toEqual(b);
  });
});
