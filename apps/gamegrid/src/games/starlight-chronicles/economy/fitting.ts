import type { ModuleDefinition } from './inventory';
import type { ModuleSlot, StarlightProfile } from '../rules';
import { resolveCrewBonuses } from '../crew/crewRules';
import { deriveShipDamageEffects } from '../ship/shipDamage';
import { getHullById, loadHullCatalog, type HullCatalog } from '../ship/hulls';
import { droneDerivedBonuses, loadDrones } from '../fleet/drone';

export interface DerivedShipStats {
  hullId: string;
  hullClass: string;
  maxHp: number;
  maxShield: number;
  shieldRegenPerSec: number;
  bulletDamage: number;
  fireIntervalMs: number;
  scanRateMultiplier: number;
  moveSpeed: number;
  dodgeWindowMultiplier: number;
  abilityCooldownMs: number;
  diplomacyBonus: number;
  scanBonus: number;
  repairEfficiency: number;
  combatBonus: number;
  cargoCapacity: number;
  fleeBonus: number;
  slotLayout: {
    weaponSlots: number;
    shieldSlots: number;
    utilitySlots: number;
  };
  activeLoadout: {
    weapon: string[];
    shield: string[];
    utility: string[];
  };
  activeWingmen: string[];
  activeDroneId: string | null;
}

export const BASE_STATS: DerivedShipStats = {
  hullId: 'pathfinder-frigate',
  hullClass: 'Frigate',
  maxHp: 100,
  maxShield: 40,
  shieldRegenPerSec: 2.2,
  bulletDamage: 12,
  fireIntervalMs: 180,
  scanRateMultiplier: 1,
  moveSpeed: 560,
  dodgeWindowMultiplier: 1,
  abilityCooldownMs: 9000,
  diplomacyBonus: 0,
  scanBonus: 0,
  repairEfficiency: 0,
  combatBonus: 0,
  cargoCapacity: 18,
  fleeBonus: 0,
  slotLayout: {
    weaponSlots: 1,
    shieldSlots: 1,
    utilitySlots: 2
  },
  activeLoadout: {
    weapon: [],
    shield: [],
    utility: []
  },
  activeWingmen: [],
  activeDroneId: null
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function equipModule(profile: StarlightProfile, moduleId: string, slot: ModuleSlot): StarlightProfile {
  if (!profile.inventory.modules.includes(moduleId)) return profile;
  const loadout = profile.hullLoadouts[profile.activeHullId] ?? { weapon: [], shield: [], utility: [] };
  const current = loadout[slot];
  if (current.includes(moduleId)) return profile;
  const nextSlot = [...current, moduleId];
  return {
    ...profile,
    hullLoadouts: {
      ...profile.hullLoadouts,
      [profile.activeHullId]: {
        ...loadout,
        [slot]: nextSlot
      }
    },
    equipped: {
      ...profile.equipped,
      [slot]: nextSlot[0] ?? null
    }
  };
}

export function deriveShipStats(profile: StarlightProfile, modules: ModuleDefinition[], hullCatalog: HullCatalog = loadHullCatalog()): DerivedShipStats {
  const byId = new Map(modules.map((entry) => [entry.id, entry]));
  const hull = getHullById(hullCatalog, profile.activeHullId);
  const loadout = profile.hullLoadouts[profile.activeHullId] ?? { weapon: [], shield: [], utility: [] };
  const selected = [...loadout.weapon, ...loadout.shield, ...loadout.utility].map((id) => byId.get(id) ?? null).filter((entry): entry is ModuleDefinition => Boolean(entry));

  let damageScale = 1;
  let fireRateScale = 1;
  let shieldBonus = 0;
  let shieldRegenBonus = 0;
  let scanBonus = 0;
  let speedBonus = 0;
  let abilityCooldownBonus = 0;

  for (let i = 0; i < selected.length; i += 1) {
    const fx = selected[i].effects;
    damageScale += fx.damageBonus ?? 0;
    fireRateScale += fx.fireRateBonus ?? 0;
    shieldBonus += fx.shieldBonus ?? 0;
    shieldRegenBonus += fx.shieldRegenBonus ?? 0;
    scanBonus += fx.scanBonus ?? 0;
    speedBonus += fx.speedBonus ?? 0;
    abilityCooldownBonus += fx.abilityCooldownBonus ?? 0;
  }

  const crewBonuses = resolveCrewBonuses(profile.crew);
  const damageEffects = deriveShipDamageEffects(profile.shipDamage);
  const hullStats = hull.stats;
  const droneBonus = droneDerivedBonuses(profile, loadDrones());

  return {
    hullId: hull.id,
    hullClass: hull.class,
    maxHp: hullStats.maxHP,
    maxShield: BASE_STATS.maxShield + shieldBonus + droneBonus.shieldBonus,
    shieldRegenPerSec: BASE_STATS.shieldRegenPerSec + shieldRegenBonus,
    bulletDamage: BASE_STATS.bulletDamage * hullStats.damageMult * damageScale * (1 + crewBonuses.combatBonus * 0.01),
    fireIntervalMs: Math.round(clamp((hullStats.fireRate / fireRateScale) * damageEffects.weaponFireRateMultiplier, 90, 360)),
    scanRateMultiplier: clamp((BASE_STATS.scanRateMultiplier + hullStats.scanBonus + scanBonus + droneBonus.scanBonus) * damageEffects.sensorScanMultiplier * (1 + crewBonuses.scanBonus * 0.01), 0.7, 2.8),
    moveSpeed: hullStats.moveSpeed * (1 + speedBonus) * damageEffects.engineMoveMultiplier,
    dodgeWindowMultiplier: damageEffects.engineDodgeWindowMultiplier,
    abilityCooldownMs: Math.round(clamp(BASE_STATS.abilityCooldownMs * (1 - abilityCooldownBonus), 3000, 12000)),
    diplomacyBonus: crewBonuses.diplomacyBonus + hullStats.diplomacyBonus,
    scanBonus: crewBonuses.scanBonus,
    repairEfficiency: crewBonuses.repairEfficiency,
    combatBonus: crewBonuses.combatBonus,
    cargoCapacity: hullStats.cargoCapacity,
    fleeBonus: hullStats.fleeBonus,
    slotLayout: {
      weaponSlots: hull.slots.weaponSlots,
      shieldSlots: hull.slots.shieldSlots,
      utilitySlots: hull.slots.utilitySlots
    },
    activeLoadout: {
      weapon: [...loadout.weapon],
      shield: [...loadout.shield],
      utility: [...loadout.utility]
    },
    activeWingmen: [...profile.activeWingmenIds],
    activeDroneId: profile.activeDroneId
  };
}
