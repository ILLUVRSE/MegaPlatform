import { describe, expect, it } from 'vitest';
import { createInitialProfile } from '../rules';
import { loadDrones } from './drone';
import { loadEscortMissions, resolveEscortMission, resolveEscortNode } from './escortMissions';

describe('starlight escort missions', () => {
  it('loads schema and resolves deterministic mission pick', () => {
    const catalog = loadEscortMissions();
    expect(catalog.escortMissions.length).toBeGreaterThanOrEqual(3);
    const a = resolveEscortMission(catalog, 333, 'n-1-1').id;
    const b = resolveEscortMission(catalog, 333, 'n-1-1').id;
    expect(a).toBe(b);
  });

  it('resolves convoy hp deterministically with stable win/lose output', () => {
    const profile = createInitialProfile(334);
    const catalog = loadEscortMissions();
    const drones = loadDrones();
    const a = resolveEscortNode(catalog, profile, drones, 444, 'n-2-0');
    const b = resolveEscortNode(catalog, profile, drones, 444, 'n-2-0');
    expect(a).toEqual(b);
    expect(a.convoyHpRemaining).toBeGreaterThanOrEqual(0);
    expect(a.convoyHpRemaining).toBeLessThanOrEqual(a.convoyHpMax);
  });
});
