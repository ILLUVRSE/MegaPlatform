import itemsRaw from '../../../content/starlight-chronicles/items.json';
import type { ModuleSlot, StarlightProfile } from '../rules';
import { applyHullDelta, fieldRepairSystem, repairAllSystems } from '../ship/shipDamage';

export interface ModuleDefinition {
  id: string;
  name: string;
  slot: ModuleSlot;
  rarity: 'common' | 'uncommon' | 'rare';
  price: number;
  sellValue: number;
  unlockRank: number;
  tags: string[];
  effects: {
    damageBonus?: number;
    fireRateBonus?: number;
    shieldBonus?: number;
    shieldRegenBonus?: number;
    scanBonus?: number;
    speedBonus?: number;
    abilityCooldownBonus?: number;
  };
}

export interface ConsumableDefinition {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare';
  price: number;
  sellValue: number;
  unlockRank: number;
  tags: string[];
  effect: {
    type: 'repair' | 'next-combat-damage' | 'next-explore-scan' | 'morale';
    value: number;
  };
}

export interface LootDefinition {
  id: string;
  name: string;
  sellValue: number;
  materialYield: number;
}

export interface ItemsCatalog {
  modules: ModuleDefinition[];
  consumables: ConsumableDefinition[];
  loot: LootDefinition[];
  shop: {
    buyModuleIds: string[];
    buyConsumableIds: string[];
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isModule(value: unknown): value is ModuleDefinition {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.slot === 'weapon' || value.slot === 'shield' || value.slot === 'utility') &&
    (value.rarity === 'common' || value.rarity === 'uncommon' || value.rarity === 'rare') &&
    typeof value.price === 'number' &&
    typeof value.sellValue === 'number' &&
    typeof value.unlockRank === 'number' &&
    Array.isArray(value.tags) &&
    isRecord(value.effects)
  );
}

function isConsumable(value: unknown): value is ConsumableDefinition {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.rarity === 'common' || value.rarity === 'uncommon' || value.rarity === 'rare') &&
    typeof value.price === 'number' &&
    typeof value.sellValue === 'number' &&
    typeof value.unlockRank === 'number' &&
    Array.isArray(value.tags) &&
    isRecord(value.effect) &&
    (value.effect.type === 'repair' ||
      value.effect.type === 'next-combat-damage' ||
      value.effect.type === 'next-explore-scan' ||
      value.effect.type === 'morale') &&
    typeof value.effect.value === 'number'
  );
}

function isLoot(value: unknown): value is LootDefinition {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' && typeof value.name === 'string' && typeof value.sellValue === 'number' && typeof value.materialYield === 'number';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function loadItemsCatalog(): ItemsCatalog {
  const parsed = itemsRaw as unknown as ItemsCatalog;
  if (!parsed || !Array.isArray(parsed.modules) || !Array.isArray(parsed.consumables) || !Array.isArray(parsed.loot)) {
    throw new Error('starlight items json invalid');
  }
  if (!parsed.modules.every(isModule) || !parsed.consumables.every(isConsumable) || !parsed.loot.every(isLoot)) {
    throw new Error('starlight items json malformed entries');
  }
  return parsed;
}

export function grantModule(profile: StarlightProfile, moduleId: string): StarlightProfile {
  if (profile.inventory.modules.includes(moduleId)) return profile;
  return {
    ...profile,
    inventory: {
      ...profile.inventory,
      modules: [...profile.inventory.modules, moduleId]
    }
  };
}

export function buyModule(profile: StarlightProfile, module: ModuleDefinition, price = module.price): StarlightProfile {
  if (module.unlockRank > profile.captainRank) return profile;
  if (profile.inventory.credits < price) return profile;
  if (profile.inventory.modules.includes(module.id)) return profile;

  return {
    ...profile,
    inventory: {
      ...profile.inventory,
      credits: profile.inventory.credits - price,
      modules: [...profile.inventory.modules, module.id]
    }
  };
}

export function buyConsumable(profile: StarlightProfile, consumable: ConsumableDefinition, price = consumable.price): StarlightProfile {
  if (consumable.unlockRank > profile.captainRank) return profile;
  if (profile.inventory.credits < price) return profile;
  return {
    ...profile,
    inventory: {
      ...profile.inventory,
      credits: profile.inventory.credits - price,
      consumables: {
        ...profile.inventory.consumables,
        [consumable.id]: (profile.inventory.consumables[consumable.id] ?? 0) + 1
      }
    }
  };
}

export function sellLoot(profile: StarlightProfile, lootId: string, quantity: number, lootTable: LootDefinition[]): StarlightProfile {
  const safeQty = Math.max(0, Math.floor(quantity));
  if (safeQty <= 0) return profile;
  const have = profile.inventory.loot[lootId] ?? 0;
  if (have <= 0) return profile;

  const loot = lootTable.find((entry) => entry.id === lootId);
  if (!loot) return profile;

  const sold = Math.min(have, safeQty);
  const remaining = have - sold;
  const nextLoot = { ...profile.inventory.loot };
  if (remaining <= 0) delete nextLoot[lootId];
  else nextLoot[lootId] = remaining;

  return {
    ...profile,
    inventory: {
      ...profile.inventory,
      credits: profile.inventory.credits + sold * loot.sellValue,
      materials: profile.inventory.materials + sold * loot.materialYield,
      loot: nextLoot
    }
  };
}

export function repairShip(profile: StarlightProfile, creditsCost: number, repairAmount: number, repairEfficiencyBonus = 0): StarlightProfile {
  if (profile.inventory.credits < creditsCost) return profile;
  const scaledRepair = Math.round(repairAmount * (1 + clamp(repairEfficiencyBonus, 0, 30) * 0.01));
  let shipDamage = applyHullDelta(profile.shipDamage, scaledRepair);
  if (repairEfficiencyBonus >= 8) {
    shipDamage = repairAllSystems(shipDamage, 1);
  }

  return {
    ...profile,
    shipCondition: shipDamage.hullIntegrity,
    shipDamage,
    inventory: {
      ...profile.inventory,
      credits: profile.inventory.credits - creditsCost
    }
  };
}

export function applyConsumableEffect(profile: StarlightProfile, consumable: ConsumableDefinition, runSeed = 0, nodeId = 'inventory', eventIndex = 0): StarlightProfile {
  if (consumable.id === 'field-repair') {
    const repaired = fieldRepairSystem(profile.shipDamage, runSeed, nodeId, eventIndex);
    return {
      ...profile,
      shipCondition: repaired.hullIntegrity,
      shipDamage: repaired
    };
  }

  if (consumable.effect.type === 'repair') {
    const shipDamage = applyHullDelta(profile.shipDamage, consumable.effect.value);
    return {
      ...profile,
      shipCondition: shipDamage.hullIntegrity,
      shipDamage
    };
  }
  if (consumable.effect.type === 'next-combat-damage') {
    return {
      ...profile,
      runModifiers: {
        ...profile.runModifiers,
        nextCombatDamageBoost: profile.runModifiers.nextCombatDamageBoost + consumable.effect.value
      }
    };
  }
  if (consumable.effect.type === 'next-explore-scan') {
    return {
      ...profile,
      runModifiers: {
        ...profile.runModifiers,
        nextExploreScanBoost: profile.runModifiers.nextExploreScanBoost + consumable.effect.value
      }
    };
  }
  return {
    ...profile,
    crewMorale: Math.min(100, profile.crewMorale + consumable.effect.value)
  };
}
