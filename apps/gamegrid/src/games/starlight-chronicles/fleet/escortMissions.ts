import escortRaw from '../../../content/starlight-chronicles/escort-missions.json';
import { createSeededRng, hashStringToSeed } from '../rng';
import type { FactionId, OutcomeDelta, StarlightProfile } from '../rules';
import { droneDerivedBonuses, type DroneCatalog } from './drone';
import { wingmanEscortBonus } from './wingmen';

export interface EscortMission {
  id: string;
  name: string;
  description: string;
  baseConvoyHp: number;
  microWaves: number;
  timeLimitMs: number;
  reward: {
    credits: number;
    materials: number;
    faction: FactionId;
    standing: number;
  };
}

export interface EscortMissionCatalog {
  escortMissions: EscortMission[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

export function loadEscortMissions(): EscortMissionCatalog {
  const parsed = escortRaw as unknown as EscortMissionCatalog;
  if (!parsed || !Array.isArray(parsed.escortMissions) || parsed.escortMissions.length < 3) {
    throw new Error('starlight escort missions invalid');
  }
  for (let i = 0; i < parsed.escortMissions.length; i += 1) {
    const entry = parsed.escortMissions[i] as unknown;
    if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.baseConvoyHp !== 'number') {
      throw new Error('starlight escort mission malformed');
    }
  }
  return parsed;
}

export function resolveEscortMission(catalog: EscortMissionCatalog, runSeed: number, nodeId: string): EscortMission {
  const rng = createSeededRng((runSeed ^ hashStringToSeed(`escort:${nodeId}`)) >>> 0);
  const idx = Math.max(0, Math.min(catalog.escortMissions.length - 1, rng.nextInt(0, catalog.escortMissions.length - 1)));
  return catalog.escortMissions[idx];
}

export interface EscortResolution {
  mission: EscortMission;
  success: boolean;
  convoyHpRemaining: number;
  convoyHpMax: number;
  notes: string[];
  outcome: OutcomeDelta;
}

export function resolveEscortNode(
  catalog: EscortMissionCatalog,
  profile: StarlightProfile,
  drones: DroneCatalog,
  runSeed: number,
  nodeId: string
): EscortResolution {
  const mission = resolveEscortMission(catalog, runSeed, nodeId);
  const rng = createSeededRng((runSeed ^ hashStringToSeed(`escort-resolve:${nodeId}`)) >>> 0);
  const droneBonus = droneDerivedBonuses(profile, drones);
  const wingmanBonus = wingmanEscortBonus(profile);
  const convoyHpMax = mission.baseConvoyHp + Math.round(droneBonus.convoyHpBonus);
  let convoyHp = convoyHpMax;
  let elapsedMs = 0;

  for (let wave = 0; wave < mission.microWaves; wave += 1) {
    const pressure = 8 + rng.nextInt(0, 10) + wave * 2;
    const mitigation = Math.floor(wingmanBonus * 0.7) + (profile.activeDroneId ? 2 : 0);
    const damage = Math.max(2, pressure - mitigation);
    convoyHp -= damage;
    elapsedMs += 7500 + rng.nextInt(0, 3200);
    if (convoyHp <= 0 || elapsedMs > mission.timeLimitMs) break;
  }

  const success = convoyHp > 0 && elapsedMs <= mission.timeLimitMs;
  if (!success) {
    return {
      mission,
      success,
      convoyHpRemaining: Math.max(0, convoyHp),
      convoyHpMax,
      notes: ['Escort failed: convoy destroyed or timed out.'],
      outcome: {
        credits: Math.floor(mission.reward.credits * 0.22),
        materials: Math.floor(mission.reward.materials * 0.3),
        shipCondition: -4,
        xp: 10
      }
    };
  }

  return {
    mission,
    success,
    convoyHpRemaining: convoyHp,
    convoyHpMax,
    notes: ['Escort successful: convoy reached destination.'],
    outcome: {
      credits: mission.reward.credits,
      materials: mission.reward.materials,
      factionDelta: {
        [mission.reward.faction]: mission.reward.standing
      },
      xp: 24
    }
  };
}
