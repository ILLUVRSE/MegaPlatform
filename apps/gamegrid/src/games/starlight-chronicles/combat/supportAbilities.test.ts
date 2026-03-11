import { describe, expect, it } from 'vitest';
import { castSupportAbility, createSupportAbilityState, activeDamageMultiplier } from './supportAbilities';

describe('support abilities', () => {
  it('enforces cooldown and charges', () => {
    let state = createSupportAbilityState(['p1']);
    const first = castSupportAbility(state, 'p1', 'captain_rally', 1000);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    state = first.state;

    const cooldown = castSupportAbility(state, 'p1', 'captain_rally', 1200);
    expect(cooldown.ok).toBe(false);

    const second = castSupportAbility(state, 'p1', 'captain_rally', 32000);
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    const exhausted = castSupportAbility(second.state, 'p1', 'captain_rally', 65000);
    expect(exhausted.ok).toBe(false);
  });

  it('active damage multiplier includes rally/overcharge', () => {
    let state = createSupportAbilityState(['p1']);
    const rally = castSupportAbility(state, 'p1', 'captain_rally', 1000);
    expect(rally.ok).toBe(true);
    if (!rally.ok) return;
    state = rally.state;
    const overcharge = castSupportAbility(state, 'p1', 'tactical_overcharge', 2000);
    expect(overcharge.ok).toBe(true);
    if (!overcharge.ok) return;

    const mult = activeDamageMultiplier(overcharge.state, 2500);
    expect(mult).toBeGreaterThan(1.3);
  });
});
