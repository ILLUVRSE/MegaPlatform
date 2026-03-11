import { describe, expect, it } from 'vitest';
import { createCombatShip, applyIncomingDamage } from './combatRules';
import { BASE_STATS } from '../economy/fitting';

describe('starlight combat rules', () => {
  it('applies damage to shield first then hp', () => {
    const ship = createCombatShip(BASE_STATS);
    const afterSmall = applyIncomingDamage(ship, 15);
    expect(afterSmall.shield).toBe(25);
    expect(afterSmall.hp).toBe(100);

    const afterBig = applyIncomingDamage(afterSmall, 40);
    expect(afterBig.shield).toBe(0);
    expect(afterBig.hp).toBe(85);
  });
});
