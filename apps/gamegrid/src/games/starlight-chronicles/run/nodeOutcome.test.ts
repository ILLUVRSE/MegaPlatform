import { describe, expect, it } from 'vitest';
import { createInitialProfile } from '../rules';
import { applyRunNodeOutcome } from './runRules';

describe('starlight node outcome reducer', () => {
  it('updates condition credits and morale', () => {
    const profile = createInitialProfile(9);
    const next = applyRunNodeOutcome(profile, {
      shipCondition: -6,
      credits: 45,
      crewMorale: 3,
      xp: 10,
      factionDelta: { concordium: 1 }
    });

    expect(next.shipCondition).toBe(profile.shipCondition - 6);
    expect(next.inventory.credits).toBe(profile.inventory.credits + 45);
    expect(next.crewMorale).toBe(profile.crewMorale + 3);
    expect(next.factions.concordium).toBe(profile.factions.concordium + 1);
  });
});
