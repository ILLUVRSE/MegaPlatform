import { createSeededRng, hashStringToSeed } from '../rng';
import type { AnomalyDefinition } from '../explore/exploreRules';
import type { MissionDefinition } from '../combat/enemyPatterns';
import type { ItemsCatalog, ModuleDefinition, ConsumableDefinition } from '../economy/inventory';
import type { FactionId, OutcomeDelta, StarlightProfile } from '../rules';

export interface ShopOffer {
  kind: 'module' | 'consumable';
  id: string;
  name: string;
  price: number;
}

export interface ShopNodeInventory {
  offers: ShopOffer[];
  repairDiscountPct: number;
  crewBonusApplied: string[];
}

export function factionBiasStanding(profile: StarlightProfile, faction: FactionId): number {
  return profile.factions[faction] ?? 0;
}

function factionForItem(module: ModuleDefinition | ConsumableDefinition): FactionId {
  if (module.tags.includes('weapon')) return 'freebelt';
  if (module.tags.includes('shield')) return 'concordium';
  if (module.tags.includes('utility')) return 'astral';
  if (module.tags.includes('consumable')) return 'freebelt';
  return 'concordium';
}

export function shopPriceWithFaction(base: number, profile: StarlightProfile, faction: FactionId): number {
  const standing = factionBiasStanding(profile, faction);
  const modifier = 1 - Math.max(-0.25, Math.min(0.25, standing * 0.015));
  return Math.max(5, Math.round(base * modifier));
}

export function resolveShopInventory(
  items: ItemsCatalog,
  runSeed: number,
  nodeId: string,
  profile: StarlightProfile,
  repairEfficiencyBonus = 0,
  systemTags: string[] = []
): ShopNodeInventory {
  const rng = createSeededRng((runSeed ^ hashStringToSeed(nodeId)) >>> 0);
  const modulePool = items.modules.filter((entry) => {
    if (entry.unlockRank > profile.captainRank + 1) return false;
    if (systemTags.includes('blackmarket') && entry.tags.includes('contraband')) return true;
    if (systemTags.includes('industrial') && entry.tags.includes('weapon')) return true;
    return true;
  });
  const consumablePool = items.consumables.filter((entry) => entry.unlockRank <= profile.captainRank + 1);

  const offers: ShopOffer[] = [];
  const baseModuleCount = profile.metaUnlocks.betterShopNode ? 4 : 3;
  const baseConsumableCount = profile.metaUnlocks.betterShopNode ? 3 : 2;
  const bonusSlot = repairEfficiencyBonus >= 8 ? 1 : 0;
  const moduleCount = baseModuleCount + bonusSlot;
  const consumableCount = baseConsumableCount;

  for (let i = 0; i < moduleCount && modulePool.length > 0; i += 1) {
    const mod = modulePool[rng.nextInt(0, modulePool.length - 1)] ?? modulePool[0];
    if (!mod) break;
    if (offers.some((entry) => entry.id === mod.id)) continue;
    offers.push({
      kind: 'module',
      id: mod.id,
      name: mod.name,
      price: shopPriceWithFaction(mod.price, profile, factionForItem(mod))
    });
  }

  for (let i = 0; i < consumableCount && consumablePool.length > 0; i += 1) {
    const item = consumablePool[rng.nextInt(0, consumablePool.length - 1)] ?? consumablePool[0];
    if (!item) break;
    if (offers.some((entry) => entry.id === item.id)) continue;
    offers.push({
      kind: 'consumable',
      id: item.id,
      name: item.name,
      price: shopPriceWithFaction(item.price, profile, factionForItem(item))
    });
  }

  return {
    offers,
    repairDiscountPct: Math.min(20, Math.floor(repairEfficiencyBonus * 0.8)),
    crewBonusApplied: [
      ...(bonusSlot > 0 ? ['Engineer Bonus: +1 module slot'] : []),
      ...(repairEfficiencyBonus > 0 ? [`Engineer Bonus: -${Math.min(20, Math.floor(repairEfficiencyBonus * 0.8))}% repair cost`] : [])
    ]
  };
}

export function resolveMissionForNode(missions: MissionDefinition[], nodeId: string, isBossNode: boolean): MissionDefinition {
  const pool = missions.filter((entry) => (isBossNode ? entry.kind === 'boss' : entry.kind === 'combat'));
  const seed = hashStringToSeed(nodeId);
  const rng = createSeededRng(seed);
  return pool[rng.nextInt(0, pool.length - 1)] ?? missions[0];
}

export function resolveAnomalyForNode(anomalies: AnomalyDefinition[], nodeId: string, rank: number, allowRare: boolean): AnomalyDefinition {
  const pool = anomalies.filter((entry) => entry.unlockRank <= rank && (allowRare || !entry.tags.includes('mystery')));
  const seed = hashStringToSeed(`anom-${nodeId}`);
  const rng = createSeededRng(seed);
  return pool[rng.nextInt(0, pool.length - 1)] ?? anomalies[0];
}

export function applyCrewExploreModifier(outcome: OutcomeDelta, scanBonus: number): OutcomeDelta {
  if (!outcome.shipCondition || outcome.shipCondition >= 0 || scanBonus <= 0) {
    return outcome;
  }
  const reduction = Math.min(2, Math.floor(scanBonus / 6));
  return {
    ...outcome,
    shipCondition: outcome.shipCondition + reduction
  };
}

export function hasCaptainPersuadeBonus(diplomacyBonus: number, threshold: number): boolean {
  return diplomacyBonus >= threshold;
}
