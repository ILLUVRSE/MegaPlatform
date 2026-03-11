import { hashStringToSeed, createSeededRng } from '../rng';
import type { DerivedShipStats } from '../economy/fitting';
import { clearContrabandCargo, loadGoodsCatalog } from '../economy/goods';
import { loadDrones, droneDerivedBonuses } from '../fleet/drone';
import { wingmanRiskReduction } from '../fleet/wingmen';
import type { StarlightProfile } from '../rules';
import type { FrontlineState } from './frontline';
import type { SecurityTier, UniverseSystem } from './universe';

export interface InspectionResult {
  inspected: boolean;
  detected: boolean;
  bribeAttempted: boolean;
  bribeSucceeded: boolean;
  fineCredits: number;
  standingPenalty: number;
  confiscatedUnits: number;
  profile: StarlightProfile;
}

export interface PiracyRollResult {
  triggered: boolean;
  ambush: boolean;
  chance: number;
}

export interface FleeResult {
  success: boolean;
  chance: number;
}

function baseInspectionChance(security: SecurityTier): number {
  if (security === 'SAFE') return 0.56;
  if (security === 'LOW') return 0.3;
  return 0;
}

function basePiracyChance(security: SecurityTier): number {
  if (security === 'SAFE') return 0.03;
  if (security === 'LOW') return 0.24;
  return 0.52;
}

function hasContraband(profile: StarlightProfile): boolean {
  const catalog = loadGoodsCatalog();
  const illegal = new Set(catalog.goods.filter((entry) => entry.legality === 'contraband').map((entry) => entry.id));
  return Object.keys(profile.cargo).some((id) => illegal.has(id));
}

export function resolveInspection(
  profile: StarlightProfile,
  system: UniverseSystem,
  runIndex: number,
  captainBonus: number,
  hasHiddenCompartments: boolean,
  attemptBribe: boolean
): InspectionResult {
  const contraband = hasContraband(profile);
  if (!contraband || system.security === 'NULL') {
    return {
      inspected: false,
      detected: false,
      bribeAttempted: false,
      bribeSucceeded: false,
      fineCredits: 0,
      standingPenalty: 0,
      confiscatedUnits: 0,
      profile
    };
  }

  const seed = (profile.seedBase ^ hashStringToSeed(`inspect:${system.id}:${runIndex}`)) >>> 0;
  const rng = createSeededRng(seed);
  const inspected = rng.next() < baseInspectionChance(system.security);
  if (!inspected) {
    return {
      inspected,
      detected: false,
      bribeAttempted: false,
      bribeSucceeded: false,
      fineCredits: 0,
      standingPenalty: 0,
      confiscatedUnits: 0,
      profile
    };
  }

  const detectionBase = system.security === 'SAFE' ? 0.72 : 0.46;
  const hiddenReduction = hasHiddenCompartments ? 0.2 : 0;
  const captainReduction = Math.min(0.18, captainBonus * 0.01);
  const smugglerReduction = droneDerivedBonuses(profile, loadDrones()).smugglerReduction;
  const detectChance = Math.max(0.1, detectionBase - hiddenReduction - captainReduction - smugglerReduction);
  const detected = rng.next() < detectChance;

  if (!detected) {
    return {
      inspected,
      detected,
      bribeAttempted: false,
      bribeSucceeded: false,
      fineCredits: 0,
      standingPenalty: 0,
      confiscatedUnits: 0,
      profile
    };
  }

  if (attemptBribe) {
    const bribeChance = Math.max(0.2, Math.min(0.86, 0.44 + captainBonus * 0.015 + (system.security === 'LOW' ? 0.1 : 0)));
    const bribeSucceeded = rng.next() < bribeChance;
    const bribeCost = Math.max(30, Math.round(70 - captainBonus * 2));
    const bribedProfile: StarlightProfile = {
      ...profile,
      inventory: {
        ...profile.inventory,
        credits: Math.max(0, profile.inventory.credits - bribeCost)
      }
    };

    if (bribeSucceeded) {
      return {
        inspected,
        detected,
        bribeAttempted: true,
        bribeSucceeded,
        fineCredits: bribeCost,
        standingPenalty: 0,
        confiscatedUnits: 0,
        profile: bribedProfile
      };
    }

    profile = bribedProfile;
  }

  const confiscated = clearContrabandCargo(profile, loadGoodsCatalog());
  const fineCredits = Math.max(35, confiscated.confiscatedUnits * 22);
  const standingPenalty = Math.max(1, Math.ceil(confiscated.confiscatedUnits / 4));

  return {
    inspected,
    detected,
    bribeAttempted: attemptBribe,
    bribeSucceeded: false,
    fineCredits,
    standingPenalty,
    confiscatedUnits: confiscated.confiscatedUnits,
    profile: {
      ...confiscated.profile,
      inventory: {
        ...confiscated.profile.inventory,
        credits: Math.max(0, confiscated.profile.inventory.credits - fineCredits)
      },
      factions: {
        ...confiscated.profile.factions,
        concordium: confiscated.profile.factions.concordium - standingPenalty
      }
    }
  };
}

export function rollPiracyEncounter(
  profile: StarlightProfile,
  system: UniverseSystem,
  frontline: FrontlineState,
  runIndex: number,
  patrolModifier = 0
): PiracyRollResult {
  const seed = (profile.seedBase ^ hashStringToSeed(`piracy:${system.id}:${runIndex}:${frontline.weekKey}`)) >>> 0;
  const rng = createSeededRng(seed);
  const frontlineBonus = frontline.contestedSystemIds.includes(system.id) ? 0.14 : 0;
  const wingmanReduction = wingmanRiskReduction(profile);
  const chance = Math.min(0.9, Math.max(0.01, basePiracyChance(system.security) + frontlineBonus + patrolModifier - wingmanReduction));
  const triggered = rng.next() < chance;
  return {
    triggered,
    ambush: triggered,
    chance
  };
}

export function resolveFleeAttempt(profile: StarlightProfile, stats: DerivedShipStats, runIndex: number, systemId: string): FleeResult {
  const seed = (profile.seedBase ^ hashStringToSeed(`flee:${systemId}:${runIndex}`)) >>> 0;
  const rng = createSeededRng(seed);
  const enginePenalty = profile.shipDamage.systems.engines * 0.08;
  const loadout = profile.hullLoadouts[profile.activeHullId];
  const utilityBonus =
    loadout?.utility.some((id) => id === 'thruster-lattice' || id === 'nav-compass') ? 0.09 : 0;
  const crewBonus = (profile.crew.active.engineer ? 0.06 : 0) + (profile.crew.active.tactical ? 0.06 : 0);
  const speedBonus = Math.min(0.1, (stats.moveSpeed - 560) / 900);
  const chance = Math.max(0.15, Math.min(0.9, 0.5 - enginePenalty + utilityBonus + crewBonus + speedBonus + stats.fleeBonus));
  return {
    success: rng.next() < chance,
    chance
  };
}
