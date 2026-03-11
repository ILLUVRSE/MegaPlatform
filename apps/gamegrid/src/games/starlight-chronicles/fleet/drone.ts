import dronesRaw from '../../../content/starlight-chronicles/drones.json';
import type { StarlightProfile } from '../rules';

export interface Drone {
  id: string;
  name: string;
  type: 'repair' | 'shield' | 'scan' | 'smuggler';
  rarity: 'common' | 'uncommon' | 'rare';
  effects: {
    postCombatHullRepair?: number;
    shieldBonus?: number;
    scanBonus?: number;
    contrabandDetectionReduction?: number;
    convoyHpBonus?: number;
  };
}

export interface DroneCatalog {
  drones: Drone[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

export function loadDrones(): DroneCatalog {
  const parsed = dronesRaw as unknown as DroneCatalog;
  if (!parsed || !Array.isArray(parsed.drones) || parsed.drones.length < 6) {
    throw new Error('starlight drones content invalid');
  }
  for (let i = 0; i < parsed.drones.length; i += 1) {
    const entry = parsed.drones[i] as unknown;
    if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.name !== 'string' || !isRecord(entry.effects)) {
      throw new Error('starlight drone malformed');
    }
  }
  return parsed;
}

export function activeDrone(profile: StarlightProfile, catalog: DroneCatalog): Drone | null {
  if (!profile.activeDroneId) return null;
  return catalog.drones.find((entry) => entry.id === profile.activeDroneId) ?? null;
}

export function assignDrone(profile: StarlightProfile, droneId: string | null): StarlightProfile {
  if (droneId === null) return { ...profile, activeDroneId: null };
  if (!profile.ownedDroneIds.includes(droneId)) return profile;
  return {
    ...profile,
    activeDroneId: droneId
  };
}

export function unlockDrone(profile: StarlightProfile, droneId: string): StarlightProfile {
  if (profile.ownedDroneIds.includes(droneId)) return profile;
  return {
    ...profile,
    ownedDroneIds: [...profile.ownedDroneIds, droneId]
  };
}

export function droneDerivedBonuses(profile: StarlightProfile, catalog: DroneCatalog): { shieldBonus: number; scanBonus: number; smugglerReduction: number; convoyHpBonus: number } {
  const drone = activeDrone(profile, catalog);
  if (!drone) return { shieldBonus: 0, scanBonus: 0, smugglerReduction: 0, convoyHpBonus: 0 };
  return {
    shieldBonus: drone.effects.shieldBonus ?? 0,
    scanBonus: drone.effects.scanBonus ?? 0,
    smugglerReduction: drone.effects.contrabandDetectionReduction ?? 0,
    convoyHpBonus: drone.effects.convoyHpBonus ?? 0
  };
}

export function applyPostCombatDroneRepair(profile: StarlightProfile, catalog: DroneCatalog): StarlightProfile {
  const drone = activeDrone(profile, catalog);
  const repair = drone?.effects.postCombatHullRepair ?? 0;
  if (repair <= 0) return profile;
  return {
    ...profile,
    shipCondition: Math.min(100, profile.shipCondition + repair),
    shipDamage: {
      ...profile.shipDamage,
      hullIntegrity: Math.min(100, profile.shipDamage.hullIntegrity + repair)
    }
  };
}
