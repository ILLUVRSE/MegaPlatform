import type { CrewAssignments } from '../crew/crewTypes';
import type { ShipDamageState } from '../ship/shipDamage';
import type { InventoryState, EquippedModules, RunModifiers, StarlightProfile } from '../rules';
import type { TradeContract } from '../economy/contracts';
import type { RunDifficulty, RunFocus, RunState, StarMapGraph } from './runTypes';
import type { FrontlineState } from '../world/frontline';

export interface RunSnapshot {
  runSeed: number;
  focus: RunFocus;
  difficulty: RunDifficulty;
  mapGraph: StarMapGraph;
  currentNodeId: string | null;
  partyConfig: {
    mode: 'solo';
    maxPlayers: 4;
  };
  crewAssignments: CrewAssignments;
  shipDamage: ShipDamageState;
  inventory: InventoryState;
  equipped: EquippedModules;
  runModifiers: RunModifiers;
  shipConfig: {
    activeHullId: string;
    loadout: {
      weapon: string[];
      shield: string[];
      utility: string[];
    };
    cosmetics: {
      skinKey: string;
      decalKey: string;
      trailKey: string;
    };
    cargoCapacity: number;
    activeWingmenIds: string[];
    activeDroneId: string | null;
    patrolContextIds: string[];
  };
  worldContext: {
    regionId: string;
    systemId: string;
    routeTargetSystemId: string | null;
    activeContracts: TradeContract[];
    marketShockIds: string[];
    frontline: FrontlineState;
  };
}

export function createRunSnapshot(
  profile: StarlightProfile,
  graph: StarMapGraph,
  runState: RunState,
  worldContext?: { marketShockIds?: string[]; frontline?: FrontlineState; patrolContextIds?: string[] }
): RunSnapshot {
  return {
    runSeed: runState.runSeed,
    focus: runState.focus,
    difficulty: runState.difficulty,
    mapGraph: graph,
    currentNodeId: runState.currentNodeId,
    partyConfig: {
      mode: 'solo',
      maxPlayers: 4
    },
    crewAssignments: { ...profile.crew.active },
    shipDamage: {
      hullIntegrity: profile.shipDamage.hullIntegrity,
      systems: { ...profile.shipDamage.systems }
    },
    inventory: {
      ...profile.inventory,
      loot: { ...profile.inventory.loot },
      modules: [...profile.inventory.modules],
      consumables: { ...profile.inventory.consumables }
    },
    equipped: { ...profile.equipped },
    runModifiers: { ...profile.runModifiers },
    shipConfig: {
      activeHullId: profile.activeHullId,
      loadout: {
        weapon: [...(profile.hullLoadouts[profile.activeHullId]?.weapon ?? [])],
        shield: [...(profile.hullLoadouts[profile.activeHullId]?.shield ?? [])],
        utility: [...(profile.hullLoadouts[profile.activeHullId]?.utility ?? [])]
      },
      cosmetics: {
        ...(profile.hullCosmetics[profile.activeHullId] ?? { skinKey: 'navy-band', decalKey: 'none', trailKey: 'none' })
      },
      cargoCapacity: profile.cargoCapacity,
      activeWingmenIds: [...profile.activeWingmenIds],
      activeDroneId: profile.activeDroneId,
      patrolContextIds: [...(worldContext?.patrolContextIds ?? [])]
    },
    worldContext: {
      regionId: profile.currentRegionId,
      systemId: profile.currentSystemId,
      routeTargetSystemId: profile.routeTargetSystemId,
      activeContracts: profile.activeContracts.map((entry) => ({ ...entry, payoutStanding: { ...entry.payoutStanding } })),
      marketShockIds: [...(worldContext?.marketShockIds ?? [])],
      frontline: worldContext?.frontline
        ? { ...worldContext.frontline, contestedSystemIds: [...worldContext.frontline.contestedSystemIds] }
        : { weekKey: '', contestedSystemIds: [] }
    }
  };
}

export function serializeRunSnapshot(snapshot: RunSnapshot): string {
  return JSON.stringify(snapshot);
}

export function deserializeRunSnapshot(serialized: string): RunSnapshot {
  return JSON.parse(serialized) as RunSnapshot;
}
