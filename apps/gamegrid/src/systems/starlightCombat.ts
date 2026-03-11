import { ENEMY_BY_ID } from '../data/starlightEnemies';
import type { DamageType } from '../data/starlightTypes';

export function resolveDamage(targetType: string, baseDamage: number, damageType: DamageType, bonus = 0): number {
  const enemy = ENEMY_BY_ID.get(targetType);
  const multiplier = enemy?.resistances?.[damageType] ?? 1;
  return Math.max(1, baseDamage * multiplier + bonus);
}

export function applyDamageReduction(rawDamage: number, reduction: number): number {
  const clamped = Math.min(0.8, Math.max(0, reduction));
  return rawDamage * (1 - clamped);
}
