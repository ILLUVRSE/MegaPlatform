import { describe, expect, it } from 'vitest';
import { createInitialProfile } from '../rules';
import { loadGoodsCatalog } from '../economy/goods';
import { loadUniverse } from './universe';
import { computeFrontlineState } from './frontline';
import { resolveFleeAttempt, resolveInspection, rollPiracyEncounter } from './risk';
import { loadItemsCatalog } from '../economy/inventory';
import { deriveShipStats } from '../economy/fitting';

describe('starlight risk systems', () => {
  it('inspection roll is deterministic for same inputs', () => {
    const universe = loadUniverse();
    const goods = loadGoodsCatalog();
    const safe = universe.systems.find((entry) => entry.security === 'SAFE') ?? universe.systems[0];
    const contraband = goods.goods.find((entry) => entry.legality === 'contraband') ?? goods.goods[0];
    const profile = {
      ...createInitialProfile(200),
      cargo: {
        [contraband.id]: { qty: 4, avgPrice: 10 }
      }
    };

    const a = resolveInspection(profile, safe, 2, 10, false, false);
    const b = resolveInspection(profile, safe, 2, 10, false, false);
    expect(a).toEqual(b);
  });

  it('hidden compartments change detection outcomes', () => {
    const universe = loadUniverse();
    const goods = loadGoodsCatalog();
    const safe = universe.systems.find((entry) => entry.security === 'SAFE') ?? universe.systems[0];
    const contraband = goods.goods.find((entry) => entry.legality === 'contraband') ?? goods.goods[0];
    const profile = {
      ...createInitialProfile(201),
      cargo: {
        [contraband.id]: { qty: 4, avgPrice: 10 }
      }
    };

    const plain = resolveInspection(profile, safe, 5, 0, false, false);
    const hidden = resolveInspection(profile, safe, 5, 0, true, false);

    const plainPenalty = plain.fineCredits + plain.confiscatedUnits;
    const hiddenPenalty = hidden.fineCredits + hidden.confiscatedUnits;
    expect(hiddenPenalty).toBeLessThanOrEqual(plainPenalty);
  });

  it('bribe behavior is deterministic and uses captain bonus', () => {
    const universe = loadUniverse();
    const goods = loadGoodsCatalog();
    const safe = universe.systems.find((entry) => entry.security === 'SAFE') ?? universe.systems[0];
    const contraband = goods.goods.find((entry) => entry.legality === 'contraband') ?? goods.goods[0];
    const profile = {
      ...createInitialProfile(202),
      cargo: {
        [contraband.id]: { qty: 4, avgPrice: 10 }
      }
    };

    const low = resolveInspection(profile, safe, 7, 0, false, true);
    const high = resolveInspection(profile, safe, 7, 20, false, true);
    expect(high.fineCredits).toBeLessThanOrEqual(low.fineCredits);
  });

  it('piracy and flee rolls are deterministic', () => {
    const universe = loadUniverse();
    const nullSec = universe.systems.find((entry) => entry.security === 'NULL') ?? universe.systems[0];
    const frontline = computeFrontlineState(universe, 333, '2026-W07');
    const profile = createInitialProfile(333);
    const items = loadItemsCatalog();
    const stats = deriveShipStats(profile, items.modules);

    const pA = rollPiracyEncounter(profile, nullSec, frontline, 2);
    const pB = rollPiracyEncounter(profile, nullSec, frontline, 2);
    expect(pA).toEqual(pB);

    const fA = resolveFleeAttempt(profile, stats, 2, nullSec.id);
    const fB = resolveFleeAttempt(profile, stats, 2, nullSec.id);
    expect(fA).toEqual(fB);
  });
});
