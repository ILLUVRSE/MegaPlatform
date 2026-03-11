import { createInitialProfile, type StarlightProfile } from './rules';
import { generateStartingCrew } from './crew/crewGen';
import { ensureCrewConsistency } from './crew/crewRules';
import { createInitialShipDamageState } from './ship/shipDamage';

const PROFILE_KEY = 'gamegrid.starlight-chronicles.profile.v6';
const LEGACY_PROFILE_KEY_V5 = 'gamegrid.starlight-chronicles.profile.v5';
const LEGACY_PROFILE_KEY_V4 = 'gamegrid.starlight-chronicles.profile.v4';
const LEGACY_PROFILE_KEY_V3 = 'gamegrid.starlight-chronicles.profile.v3';
const LEGACY_PROFILE_KEY = 'gamegrid.starlight-chronicles.profile.v2';
const LEGACY_PROFILE_KEY_V1 = 'gamegrid.starlight-chronicles.profile.v1';

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function migrateLegacy(raw: unknown, seed: number): StarlightProfile {
  const base = createInitialProfile(seed);
  if (!raw || typeof raw !== 'object') return base;
  const legacy = raw as Record<string, unknown>;

  const hull = typeof legacy.shipCondition === 'number' ? legacy.shipCondition : base.shipCondition;
  const shipDamage = createInitialShipDamageState(hull);
  const legacyShipDamage = legacy.shipDamage as Record<string, unknown> | undefined;
  if (legacyShipDamage && typeof legacyShipDamage.hullIntegrity === 'number' && typeof legacyShipDamage.systems === 'object' && legacyShipDamage.systems) {
    const systems = legacyShipDamage.systems as Record<string, unknown>;
    shipDamage.hullIntegrity = Math.max(0, Math.min(100, Math.round(legacyShipDamage.hullIntegrity)));
    shipDamage.systems.engines = Math.max(0, Math.min(3, Math.round((systems.engines as number) ?? 0)));
    shipDamage.systems.weapons = Math.max(0, Math.min(3, Math.round((systems.weapons as number) ?? 0)));
    shipDamage.systems.sensors = Math.max(0, Math.min(3, Math.round((systems.sensors as number) ?? 0)));
  }

  const maybeCrew = legacy.crew as Record<string, unknown> | undefined;
  const fallbackCrew = generateStartingCrew(seed);
  const crew = maybeCrew
    ? ensureCrewConsistency({
        roster: Array.isArray(maybeCrew.roster) ? (maybeCrew.roster as StarlightProfile['crew']['roster']) : fallbackCrew.roster,
        active: (maybeCrew.active as StarlightProfile['crew']['active']) ?? fallbackCrew.active
      })
    : fallbackCrew;

  return {
    ...base,
    seedBase: (legacy.seedBase as number) ?? seed,
    runCount: (legacy.runCount as number) ?? 0,
    crewMorale: (legacy.crewMorale as number) ?? base.crewMorale,
    shipCondition: shipDamage.hullIntegrity,
    shipDamage,
    crew,
    inventory: {
      ...base.inventory,
      ...(legacy.inventory as object),
      consumables: {
        ...base.inventory.consumables,
        ...(((legacy.inventory as { consumables?: object } | undefined)?.consumables as object) ?? {})
      }
    },
    equipped: {
      ...base.equipped,
      ...(legacy.equipped as object)
    },
    codexLog: Array.isArray(legacy.codexLog) ? (legacy.codexLog as StarlightProfile['codexLog']) : [],
    captainXp: (legacy.captainXp as number) ?? 0,
    captainRank: (legacy.captainRank as number) ?? 1,
    chapterProgress: (legacy.chapterProgress as Record<string, string>) ?? {},
    selectedHull: (legacy.selectedHull as StarlightProfile['selectedHull']) ?? (legacy.selectedSkin as StarlightProfile['selectedHull']) ?? 'default',
    ownedHullIds: Array.isArray(legacy.ownedHullIds) ? (legacy.ownedHullIds as string[]) : base.ownedHullIds,
    activeHullId: (legacy.activeHullId as string) ?? base.activeHullId,
    hullLoadouts: (legacy.hullLoadouts as StarlightProfile['hullLoadouts']) ?? base.hullLoadouts,
    hullCosmetics: (legacy.hullCosmetics as StarlightProfile['hullCosmetics']) ?? base.hullCosmetics,
    runModifiers: {
      ...base.runModifiers,
      ...(legacy.runModifiers as object)
    },
    currentRegionId: (legacy.currentRegionId as string) ?? base.currentRegionId,
    currentSystemId: (legacy.currentSystemId as string) ?? base.currentSystemId,
    routeTargetSystemId: (legacy.routeTargetSystemId as string | null) ?? base.routeTargetSystemId,
    routeProgress: (legacy.routeProgress as StarlightProfile['routeProgress']) ?? base.routeProgress,
    cargoCapacity: (legacy.cargoCapacity as number) ?? base.cargoCapacity,
    cargo: (legacy.cargo as StarlightProfile['cargo']) ?? base.cargo,
    availableContracts: (legacy.availableContracts as StarlightProfile['availableContracts']) ?? base.availableContracts,
    activeContracts: (legacy.activeContracts as StarlightProfile['activeContracts']) ?? base.activeContracts,
    contractsCompleted: (legacy.contractsCompleted as number) ?? base.contractsCompleted,
    ownedWingmenIds: Array.isArray(legacy.ownedWingmenIds) ? (legacy.ownedWingmenIds as string[]) : base.ownedWingmenIds,
    activeWingmenIds: Array.isArray(legacy.activeWingmenIds) ? (legacy.activeWingmenIds as string[]) : base.activeWingmenIds,
    ownedDroneIds: Array.isArray(legacy.ownedDroneIds) ? (legacy.ownedDroneIds as string[]) : base.ownedDroneIds,
    activeDroneId: (legacy.activeDroneId as string | null) ?? base.activeDroneId,
    lastSeenGalacticReportWeekKey: (legacy.lastSeenGalacticReportWeekKey as string) ?? base.lastSeenGalacticReportWeekKey,
    seenTutorials: (legacy.seenTutorials as StarlightProfile['seenTutorials']) ?? base.seenTutorials
  };
}

export function loadProfile(seed: number): StarlightProfile {
  const storage = getStorage();
  if (!storage) return createInitialProfile(seed);
  try {
    const raw = storage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StarlightProfile;
      if (parsed && parsed.profileVersion === 6) return parsed;
    }
  } catch {
    // ignore
  }

  try {
    const legacyRaw =
      storage.getItem(LEGACY_PROFILE_KEY_V5) ??
      storage.getItem(LEGACY_PROFILE_KEY_V4) ??
      storage.getItem(LEGACY_PROFILE_KEY_V3) ??
      storage.getItem(LEGACY_PROFILE_KEY) ??
      storage.getItem(LEGACY_PROFILE_KEY_V1);
    if (legacyRaw) {
      return migrateLegacy(JSON.parse(legacyRaw), seed);
    }
  } catch {
    // ignore
  }

  return createInitialProfile(seed);
}

export function saveProfile(profile: StarlightProfile): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore write failures
  }
}
