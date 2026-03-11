import { createSeededRng, hashStringToSeed } from '../rng';

export type ShipSystemId = 'engines' | 'weapons' | 'sensors';

export interface ShipSystemsState {
  engines: number;
  weapons: number;
  sensors: number;
}

export interface ShipDamageState {
  hullIntegrity: number;
  systems: ShipSystemsState;
}

export interface ShipDamageDerivedEffects {
  engineMoveMultiplier: number;
  engineDodgeWindowMultiplier: number;
  weaponFireRateMultiplier: number;
  sensorScanMultiplier: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeSystemLevel(level: number): number {
  return clamp(Math.round(level), 0, 3);
}

export function createInitialShipDamageState(hullIntegrity = 72): ShipDamageState {
  return {
    hullIntegrity: clamp(Math.round(hullIntegrity), 0, 100),
    systems: {
      engines: 0,
      weapons: 0,
      sensors: 0
    }
  };
}

export function applyHullDelta(state: ShipDamageState, delta: number): ShipDamageState {
  return {
    ...state,
    hullIntegrity: clamp(state.hullIntegrity + Math.round(delta), 0, 100)
  };
}

export function applySystemDamage(state: ShipDamageState, system: ShipSystemId, delta: number): ShipDamageState {
  return {
    ...state,
    systems: {
      ...state.systems,
      [system]: normalizeSystemLevel(state.systems[system] + delta)
    }
  };
}

function weightedSystemPick(roll: number, weights: Array<{ system: ShipSystemId; weight: number }>): ShipSystemId {
  const total = weights.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  let cursor = 0;
  for (let i = 0; i < weights.length; i += 1) {
    cursor += Math.max(0, weights[i].weight) / Math.max(0.0001, total);
    if (roll <= cursor) return weights[i].system;
  }
  return weights[weights.length - 1].system;
}

export function deterministicDamageSystem(
  runSeed: number,
  nodeId: string,
  eventIndex: number,
  source: 'combat-hit' | 'anomaly-risk'
): ShipSystemId {
  const seed = (runSeed ^ hashStringToSeed(`${nodeId}:${eventIndex}:${source}`)) >>> 0;
  const rng = createSeededRng(seed);
  if (source === 'anomaly-risk') {
    return weightedSystemPick(rng.next(), [
      { system: 'sensors', weight: 0.5 },
      { system: 'engines', weight: 0.35 },
      { system: 'weapons', weight: 0.15 }
    ]);
  }

  return weightedSystemPick(rng.next(), [
    { system: 'weapons', weight: 0.4 },
    { system: 'engines', weight: 0.35 },
    { system: 'sensors', weight: 0.25 }
  ]);
}

export function applyDeterministicDamageRoll(
  state: ShipDamageState,
  runSeed: number,
  nodeId: string,
  eventIndex: number,
  source: 'combat-hit' | 'anomaly-risk',
  systemDelta = 1
): ShipDamageState {
  const system = deterministicDamageSystem(runSeed, nodeId, eventIndex, source);
  return applySystemDamage(state, system, systemDelta);
}

export function fieldRepairSystem(state: ShipDamageState, runSeed: number, nodeId: string, eventIndex: number): ShipDamageState {
  const damaged = (Object.keys(state.systems) as ShipSystemId[]).filter((id) => state.systems[id] > 0);
  if (damaged.length === 0) return state;
  const seed = (runSeed ^ hashStringToSeed(`field-repair:${nodeId}:${eventIndex}`)) >>> 0;
  const rng = createSeededRng(seed);
  const selected = damaged[rng.nextInt(0, damaged.length - 1)] ?? damaged[0];
  return applySystemDamage(state, selected, -1);
}

export function repairAllSystems(state: ShipDamageState, amount: number): ShipDamageState {
  if (amount <= 0) return state;
  return {
    ...state,
    systems: {
      engines: normalizeSystemLevel(state.systems.engines - amount),
      weapons: normalizeSystemLevel(state.systems.weapons - amount),
      sensors: normalizeSystemLevel(state.systems.sensors - amount)
    }
  };
}

export function deriveShipDamageEffects(state: ShipDamageState): ShipDamageDerivedEffects {
  const e = clamp(state.systems.engines, 0, 3);
  const w = clamp(state.systems.weapons, 0, 3);
  const s = clamp(state.systems.sensors, 0, 3);

  return {
    engineMoveMultiplier: 1 - e * 0.05,
    engineDodgeWindowMultiplier: 1 - e * 0.04,
    weaponFireRateMultiplier: 1 + w * 0.06,
    sensorScanMultiplier: 1 - s * 0.07
  };
}
