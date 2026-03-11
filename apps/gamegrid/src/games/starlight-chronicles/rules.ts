import { generateStartingCrew } from './crew/crewGen';
import { ensureCrewConsistency } from './crew/crewRules';
import type { CrewState } from './crew/crewTypes';
import { applyHullDelta, createInitialShipDamageState, type ShipDamageState } from './ship/shipDamage';
import type { TradeContract } from './economy/contracts';
import type { RouteProgress } from './run/route';

export type ModuleSlot = 'weapon' | 'shield' | 'utility';
export type FactionId = 'concordium' | 'freebelt' | 'astral';

export interface FactionStandings {
  concordium: number;
  freebelt: number;
  astral: number;
}

export interface OutcomeDelta {
  crewMorale?: number;
  shipCondition?: number;
  credits?: number;
  materials?: number;
  inventoryDrops?: string[];
  xp?: number;
  factionDelta?: Partial<FactionStandings>;
}

export interface CaptainUnlocks {
  shipSkinNebula: boolean;
  rareAnomalyNode: boolean;
  betterShopNode: boolean;
  pulseLanceWeapon: boolean;
  hullAurora: boolean;
}

export interface InventoryState {
  credits: number;
  materials: number;
  loot: Record<string, number>;
  modules: string[];
  consumables: Record<string, number>;
}

export interface EquippedModules {
  weapon: string | null;
  shield: string | null;
  utility: string | null;
}

export interface CodexEntry {
  chapterId: string;
  nodeId: string;
  choiceId: string;
  label: string;
  timestamp: number;
}

export interface RunModifiers {
  nextCombatDamageBoost: number;
  nextExploreScanBoost: number;
}

export interface StarlightProfile {
  profileVersion: 6;
  seedBase: number;
  runCount: number;
  factions: FactionStandings;
  crewMorale: number;
  shipCondition: number;
  shipDamage: ShipDamageState;
  crew: CrewState;
  inventory: InventoryState;
  equipped: EquippedModules;
  codexLog: CodexEntry[];
  captainXp: number;
  captainRank: number;
  metaUnlocks: CaptainUnlocks;
  chapterProgress: Record<string, string>;
  selectedHull: 'default' | 'nebula' | 'aurora';
  ownedHullIds: string[];
  activeHullId: string;
  hullLoadouts: Record<string, { weapon: string[]; shield: string[]; utility: string[] }>;
  hullCosmetics: Record<string, { skinKey: string; decalKey: string; trailKey: string }>;
  runModifiers: RunModifiers;
  currentRegionId: string;
  currentSystemId: string;
  routeTargetSystemId: string | null;
  routeProgress: RouteProgress | null;
  cargoCapacity: number;
  cargo: Record<string, { qty: number; avgPrice: number }>;
  availableContracts: TradeContract[];
  activeContracts: TradeContract[];
  contractsCompleted: number;
  ownedWingmenIds: string[];
  activeWingmenIds: string[];
  ownedDroneIds: string[];
  activeDroneId: string | null;
  lastSeenGalacticReportWeekKey: string;
  seenTutorials: {
    markets: boolean;
    contraband: boolean;
    security: boolean;
  };
}

const XP_THRESHOLDS = [0, 90, 220, 390, 620, 930, 1300, 1750] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveCaptainRank(xp: number): number {
  let rank = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i += 1) {
    if (xp >= XP_THRESHOLDS[i]) rank = i + 1;
  }
  return rank;
}

export function unlocksForRank(rank: number): CaptainUnlocks {
  return {
    shipSkinNebula: rank >= 2,
    rareAnomalyNode: rank >= 3,
    pulseLanceWeapon: rank >= 4,
    betterShopNode: rank >= 5,
    hullAurora: rank >= 6
  };
}

export function createInitialProfile(seedBase: number): StarlightProfile {
  const captainRank = 1;
  const shipDamage = createInitialShipDamageState(72);
  return {
    profileVersion: 6,
    seedBase,
    runCount: 0,
    factions: { concordium: 0, freebelt: 0, astral: 0 },
    crewMorale: 50,
    shipCondition: shipDamage.hullIntegrity,
    shipDamage,
    crew: generateStartingCrew(seedBase),
    inventory: {
      credits: 220,
      materials: 10,
      loot: {},
      modules: [],
      consumables: {
        'repair-kit': 1
      }
    },
    equipped: {
      weapon: null,
      shield: null,
      utility: null
    },
    codexLog: [],
    captainXp: 0,
    captainRank,
    metaUnlocks: unlocksForRank(captainRank),
    chapterProgress: {},
    selectedHull: 'default',
    ownedHullIds: ['pathfinder-frigate'],
    activeHullId: 'pathfinder-frigate',
    hullLoadouts: {
      'pathfinder-frigate': {
        weapon: [],
        shield: [],
        utility: []
      }
    },
    hullCosmetics: {
      'pathfinder-frigate': {
        skinKey: 'navy-band',
        decalKey: 'none',
        trailKey: 'none'
      }
    },
    runModifiers: {
      nextCombatDamageBoost: 0,
      nextExploreScanBoost: 0
    },
    currentRegionId: 'orion-spindle',
    currentSystemId: 'solace-anchor',
    routeTargetSystemId: null,
    routeProgress: null,
    cargoCapacity: 18,
    cargo: {},
    availableContracts: [],
    activeContracts: [],
    contractsCompleted: 0,
    ownedWingmenIds: [],
    activeWingmenIds: [],
    ownedDroneIds: ['repair-microdrone'],
    activeDroneId: 'repair-microdrone',
    lastSeenGalacticReportWeekKey: '',
    seenTutorials: {
      markets: false,
      contraband: false,
      security: false
    }
  };
}

export function addLootDrop(inventory: InventoryState, lootId: string, count = 1): InventoryState {
  return {
    ...inventory,
    loot: {
      ...inventory.loot,
      [lootId]: (inventory.loot[lootId] ?? 0) + count
    }
  };
}

export function addConsumable(profile: StarlightProfile, consumableId: string, count = 1): StarlightProfile {
  return {
    ...profile,
    inventory: {
      ...profile.inventory,
      consumables: {
        ...profile.inventory.consumables,
        [consumableId]: (profile.inventory.consumables[consumableId] ?? 0) + count
      }
    }
  };
}

export function spendConsumable(profile: StarlightProfile, consumableId: string): StarlightProfile {
  const have = profile.inventory.consumables[consumableId] ?? 0;
  if (have <= 0) return profile;
  const nextConsumables = { ...profile.inventory.consumables };
  if (have === 1) delete nextConsumables[consumableId];
  else nextConsumables[consumableId] = have - 1;

  return {
    ...profile,
    inventory: {
      ...profile.inventory,
      consumables: nextConsumables
    }
  };
}

export function applyOutcome(profile: StarlightProfile, outcome: OutcomeDelta): StarlightProfile {
  const nextFactions: FactionStandings = {
    concordium: profile.factions.concordium + (outcome.factionDelta?.concordium ?? 0),
    freebelt: profile.factions.freebelt + (outcome.factionDelta?.freebelt ?? 0),
    astral: profile.factions.astral + (outcome.factionDelta?.astral ?? 0)
  };

  let nextInventory: InventoryState = {
    ...profile.inventory,
    credits: Math.max(0, profile.inventory.credits + (outcome.credits ?? 0)),
    materials: Math.max(0, profile.inventory.materials + (outcome.materials ?? 0))
  };

  if (outcome.inventoryDrops) {
    for (let i = 0; i < outcome.inventoryDrops.length; i += 1) {
      nextInventory = addLootDrop(nextInventory, outcome.inventoryDrops[i], 1);
    }
  }

  const nextXp = Math.max(0, profile.captainXp + (outcome.xp ?? 0));
  const nextRank = resolveCaptainRank(nextXp);
  const metaUnlocks = unlocksForRank(nextRank);

  const desiredHull: StarlightProfile['selectedHull'] =
    profile.selectedHull === 'aurora'
      ? 'aurora'
      : metaUnlocks.hullAurora
        ? profile.selectedHull === 'default'
          ? 'aurora'
          : profile.selectedHull
        : metaUnlocks.shipSkinNebula && profile.selectedHull === 'default'
          ? 'nebula'
          : profile.selectedHull;

  const shipDamage = applyHullDelta(profile.shipDamage, outcome.shipCondition ?? 0);

  return {
    ...profile,
    factions: nextFactions,
    crewMorale: clamp(profile.crewMorale + (outcome.crewMorale ?? 0), 0, 100),
    shipCondition: shipDamage.hullIntegrity,
    shipDamage,
    crew: ensureCrewConsistency(profile.crew),
    inventory: nextInventory,
    captainXp: nextXp,
    captainRank: nextRank,
    metaUnlocks,
    selectedHull: desiredHull
  };
}

export function beginRun(profile: StarlightProfile): { profile: StarlightProfile; runSeed: number } {
  const nextCount = profile.runCount + 1;
  const locationBias = profile.currentSystemId.split('').reduce((sum, char) => (sum + char.charCodeAt(0)) >>> 0, 0);
  const runSeed = (profile.seedBase + nextCount * 7919 + profile.captainRank * 389 + locationBias * 31) >>> 0;
  return {
    profile: {
      ...profile,
      runCount: nextCount
    },
    runSeed
  };
}
