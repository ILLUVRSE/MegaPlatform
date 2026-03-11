import { MODULE_BY_ID } from '../data/starlightModules';

export function countOwned(inventory: string[], moduleId: string): number {
  let count = 0;
  for (const id of inventory) {
    if (id === moduleId) count += 1;
  }
  return count;
}

export function uniqueInventory(inventory: string[]): string[] {
  return [...new Set(inventory)];
}

export function salvageValue(moduleId: string): number {
  const rarity = MODULE_BY_ID.get(moduleId)?.rarity ?? 'common';
  if (rarity === 'epic') return 48;
  if (rarity === 'rare') return 20;
  return 9;
}
