import universeRaw from '../../../content/starlight-chronicles/universe.json';
import type { FactionId } from '../rules';

export type SecurityTier = 'SAFE' | 'LOW' | 'NULL';
export type SystemTag = 'industrial' | 'frontier' | 'shrine' | 'blackmarket';

export interface UniverseRegion {
  id: string;
  name: string;
  systemIds: string[];
}

export interface UniverseSystem {
  id: string;
  name: string;
  regionId: string;
  security: SecurityTier;
  controllingFaction: FactionId;
  tags: SystemTag[];
  neighbors: string[];
  categoryModifiers: Record<string, number>;
}

export interface UniverseDefinition {
  regions: UniverseRegion[];
  systems: UniverseSystem[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isValidSecurity(value: unknown): value is SecurityTier {
  return value === 'SAFE' || value === 'LOW' || value === 'NULL';
}

function isValidFaction(value: unknown): value is FactionId {
  return value === 'concordium' || value === 'freebelt' || value === 'astral';
}

export function loadUniverse(): UniverseDefinition {
  const parsed = universeRaw as unknown as UniverseDefinition;
  if (!parsed || !Array.isArray(parsed.regions) || !Array.isArray(parsed.systems)) {
    throw new Error('starlight universe json invalid');
  }

  const regionIds = new Set<string>();
  for (let i = 0; i < parsed.regions.length; i += 1) {
    const region = parsed.regions[i] as unknown;
    if (!isRecord(region) || typeof region.id !== 'string' || typeof region.name !== 'string' || !Array.isArray(region.systemIds)) {
      throw new Error('starlight universe region malformed');
    }
    if (regionIds.has(region.id)) throw new Error(`duplicate region id ${region.id}`);
    regionIds.add(region.id);
  }

  const systemIds = new Set<string>();
  for (let i = 0; i < parsed.systems.length; i += 1) {
    const system = parsed.systems[i] as unknown;
    if (
      !isRecord(system) ||
      typeof system.id !== 'string' ||
      typeof system.name !== 'string' ||
      typeof system.regionId !== 'string' ||
      !isValidSecurity(system.security) ||
      !isValidFaction(system.controllingFaction) ||
      !Array.isArray(system.tags) ||
      !Array.isArray(system.neighbors) ||
      !isRecord(system.categoryModifiers)
    ) {
      throw new Error('starlight universe system malformed');
    }
    if (systemIds.has(system.id)) throw new Error(`duplicate system id ${system.id}`);
    systemIds.add(system.id);
  }

  if (parsed.regions.length < 2) throw new Error('starlight universe requires at least 2 regions');
  if (parsed.systems.length < 10) throw new Error('starlight universe requires at least 10 systems');

  for (let i = 0; i < parsed.systems.length; i += 1) {
    const system = parsed.systems[i];
    if (!regionIds.has(system.regionId)) throw new Error(`system ${system.id} references unknown region`);
    for (let n = 0; n < system.neighbors.length; n += 1) {
      if (!systemIds.has(system.neighbors[n])) throw new Error(`system ${system.id} references unknown neighbor`);
    }
  }

  return parsed;
}

export function getSystemById(universe: UniverseDefinition, systemId: string): UniverseSystem {
  const found = universe.systems.find((entry) => entry.id === systemId);
  if (!found) throw new Error(`unknown starlight system: ${systemId}`);
  return found;
}

export function getRegionById(universe: UniverseDefinition, regionId: string): UniverseRegion {
  const found = universe.regions.find((entry) => entry.id === regionId);
  if (!found) throw new Error(`unknown starlight region: ${regionId}`);
  return found;
}
