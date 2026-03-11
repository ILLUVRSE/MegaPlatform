import { describe, expect, it } from 'vitest';
import { createInitialProfile } from '../rules';
import { applyPatrolChoice, patrolPresenceForSystem, patrolRiskModifier } from './patrols';

describe('starlight patrol presence', () => {
  it('is deterministic per system/week/seed', () => {
    const a = patrolPresenceForSystem(99, 'solace-anchor', 'SAFE', '2026-W07');
    const b = patrolPresenceForSystem(99, 'solace-anchor', 'SAFE', '2026-W07');
    expect(a).toEqual(b);
  });

  it('assist and ambush apply standing changes and risk modifier polarity', () => {
    const profile = createInitialProfile(22);
    const patrol = patrolPresenceForSystem(22, 'solace-anchor', 'LOW', '2026-W07');
    const assisted = applyPatrolChoice(profile, patrol, 'assist');
    const ambushed = applyPatrolChoice(profile, patrol, 'ambush');
    expect(assisted.factions[patrol.faction]).toBeGreaterThan(profile.factions[patrol.faction]);
    expect(ambushed.factions[patrol.faction]).toBeLessThan(profile.factions[patrol.faction]);
    expect(patrolRiskModifier(patrol, 'assist')).toBeLessThan(0);
    expect(patrolRiskModifier(patrol, 'ambush')).toBeGreaterThan(0);
  });
});
