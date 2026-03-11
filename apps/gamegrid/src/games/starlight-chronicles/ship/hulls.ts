import hullsRaw from '../../../content/starlight-chronicles/hulls.json';
import type { ModuleDefinition } from '../economy/inventory';
import type { FactionId, StarlightProfile } from '../rules';

export type HullClass = 'Scout' | 'Frigate' | 'Freighter' | 'Interceptor' | 'Science Vessel' | 'Gunship';

export interface HullDefinition {
  id: string;
  name: string;
  class: HullClass;
  description: string;
  stats: {
    maxHP: number;
    moveSpeed: number;
    fireRate: number;
    damageMult: number;
    scanBonus: number;
    diplomacyBonus: number;
    cargoCapacity: number;
    fleeBonus: number;
  };
  slots: {
    weaponSlots: number;
    shieldSlots: number;
    utilitySlots: number;
  };
  unlock: {
    type: 'starter' | 'rank' | 'faction' | 'credits';
    rank?: number;
    faction?: FactionId;
    standing?: number;
    credits?: number;
  };
  visuals: {
    skinKey: string;
    silhouetteKey: string;
  };
}

export interface HullCatalog {
  hulls: HullDefinition[];
}

export interface HullLoadout {
  weapon: string[];
  shield: string[];
  utility: string[];
}

export interface HullCosmeticSelection {
  skinKey: string;
  decalKey: string;
  trailKey: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function emptyLoadout(): HullLoadout {
  return {
    weapon: [],
    shield: [],
    utility: []
  };
}

export function loadHullCatalog(): HullCatalog {
  const parsed = hullsRaw as unknown as HullCatalog;
  if (!parsed || !Array.isArray(parsed.hulls) || parsed.hulls.length < 6) {
    throw new Error('starlight hulls content invalid');
  }
  for (let i = 0; i < parsed.hulls.length; i += 1) {
    const hull = parsed.hulls[i] as unknown;
    if (
      !isRecord(hull) ||
      typeof hull.id !== 'string' ||
      typeof hull.name !== 'string' ||
      typeof hull.class !== 'string' ||
      !isRecord(hull.stats) ||
      !isRecord(hull.slots) ||
      !isRecord(hull.unlock) ||
      !isRecord(hull.visuals)
    ) {
      throw new Error('starlight hull entry malformed');
    }
  }
  return parsed;
}

export function getHullById(catalog: HullCatalog, hullId: string): HullDefinition {
  const hull = catalog.hulls.find((entry) => entry.id === hullId);
  if (!hull) throw new Error(`unknown hull ${hullId}`);
  return hull;
}

export function canUnlockHull(profile: StarlightProfile, hull: HullDefinition): boolean {
  if (profile.ownedHullIds.includes(hull.id)) return false;
  if (hull.unlock.type === 'starter') return true;
  if (hull.unlock.type === 'credits') return (hull.unlock.credits ?? 0) <= profile.inventory.credits;
  if (hull.unlock.type === 'rank') {
    return profile.captainRank >= (hull.unlock.rank ?? 1) && profile.inventory.credits >= (hull.unlock.credits ?? 0);
  }
  if (hull.unlock.type === 'faction') {
    const faction = hull.unlock.faction ?? 'concordium';
    const standing = hull.unlock.standing ?? 0;
    return profile.factions[faction] >= standing && profile.inventory.credits >= (hull.unlock.credits ?? 0);
  }
  return false;
}

function normalizeForSlots(loadout: HullLoadout, hull: HullDefinition, moduleById: Map<string, ModuleDefinition>): HullLoadout {
  const normalize = (ids: string[], slot: 'weapon' | 'shield' | 'utility', max: number) => {
    const filtered = ids.filter((id, idx) => ids.indexOf(id) === idx && moduleById.get(id)?.slot === slot);
    return filtered.slice(0, max);
  };

  return {
    weapon: normalize(loadout.weapon, 'weapon', hull.slots.weaponSlots),
    shield: normalize(loadout.shield, 'shield', hull.slots.shieldSlots),
    utility: normalize(loadout.utility, 'utility', hull.slots.utilitySlots)
  };
}

export function ensureHullState(profile: StarlightProfile, catalog: HullCatalog, modules: ModuleDefinition[]): StarlightProfile {
  const owned = profile.ownedHullIds.length > 0 ? profile.ownedHullIds : ['pathfinder-frigate'];
  const activeHullId = owned.includes(profile.activeHullId) ? profile.activeHullId : owned[0];
  const moduleById = new Map(modules.map((entry) => [entry.id, entry]));
  const hullLoadouts = { ...profile.hullLoadouts };
  const hullCosmetics = { ...profile.hullCosmetics };

  for (let i = 0; i < owned.length; i += 1) {
    const hullId = owned[i];
    const hull = getHullById(catalog, hullId);
    const loadout = hullLoadouts[hullId] ?? emptyLoadout();
    hullLoadouts[hullId] = normalizeForSlots(loadout, hull, moduleById);
    hullCosmetics[hullId] = hullCosmetics[hullId] ?? {
      skinKey: hull.visuals.skinKey,
      decalKey: 'none',
      trailKey: 'none'
    };
  }

  const activeHull = getHullById(catalog, activeHullId);
  const activeLoadout = hullLoadouts[activeHullId] ?? emptyLoadout();

  return {
    ...profile,
    ownedHullIds: owned,
    activeHullId,
    hullLoadouts,
    hullCosmetics,
    cargoCapacity: activeHull.stats.cargoCapacity,
    equipped: {
      weapon: activeLoadout.weapon[0] ?? null,
      shield: activeLoadout.shield[0] ?? null,
      utility: activeLoadout.utility[0] ?? null
    }
  };
}

export function purchaseHull(profile: StarlightProfile, hull: HullDefinition): StarlightProfile {
  if (!canUnlockHull(profile, hull)) return profile;
  const cost = hull.unlock.credits ?? 0;
  return {
    ...profile,
    ownedHullIds: [...profile.ownedHullIds, hull.id],
    inventory: {
      ...profile.inventory,
      credits: Math.max(0, profile.inventory.credits - cost)
    }
  };
}

export function switchHull(profile: StarlightProfile, catalog: HullCatalog, modules: ModuleDefinition[], hullId: string): StarlightProfile {
  if (!profile.ownedHullIds.includes(hullId)) return profile;
  return ensureHullState(
    {
      ...profile,
      activeHullId: hullId
    },
    catalog,
    modules
  );
}

export function equipModuleForHull(
  profile: StarlightProfile,
  catalog: HullCatalog,
  modules: ModuleDefinition[],
  moduleId: string,
  slot: 'weapon' | 'shield' | 'utility'
): StarlightProfile {
  if (!profile.inventory.modules.includes(moduleId)) return profile;

  const hull = getHullById(catalog, profile.activeHullId);
  const moduleById = new Map(modules.map((entry) => [entry.id, entry]));
  const moduleDef = moduleById.get(moduleId);
  if (!moduleDef || moduleDef.slot !== slot) return profile;

  const current = profile.hullLoadouts[profile.activeHullId] ?? emptyLoadout();
  const currentSlot = [...current[slot]];
  if (currentSlot.includes(moduleId)) return profile;

  const max = slot === 'weapon' ? hull.slots.weaponSlots : slot === 'shield' ? hull.slots.shieldSlots : hull.slots.utilitySlots;
  if (max <= 0) return profile;
  if (currentSlot.length >= max) {
    currentSlot[max - 1] = moduleId;
  } else {
    currentSlot.push(moduleId);
  }

  const nextLoadout = normalizeForSlots(
    {
      ...current,
      [slot]: currentSlot
    },
    hull,
    moduleById
  );

  return ensureHullState(
    {
      ...profile,
      hullLoadouts: {
        ...profile.hullLoadouts,
        [profile.activeHullId]: nextLoadout
      }
    },
    catalog,
    modules
  );
}
