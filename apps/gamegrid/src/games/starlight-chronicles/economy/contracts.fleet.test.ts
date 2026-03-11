import { describe, expect, it } from 'vitest';
import { createInitialProfile } from '../rules';
import { loadUniverse } from '../world/universe';
import { loadGoodsCatalog } from './goods';
import { generateContractsForSystem } from './contracts';

describe('starlight contracts fleet requirements', () => {
  it('deterministically marks some contracts as escort-required', () => {
    const profile = createInitialProfile(335);
    const universe = loadUniverse();
    const goods = loadGoodsCatalog();
    const a = generateContractsForSystem(universe, goods, profile, 'solace-anchor', '2026-02-15', 5);
    const b = generateContractsForSystem(universe, goods, profile, 'solace-anchor', '2026-02-15', 5);
    expect(a).toEqual(b);
    expect(a.some((entry) => typeof entry.requiresEscort === 'boolean')).toBe(true);
  });
});
