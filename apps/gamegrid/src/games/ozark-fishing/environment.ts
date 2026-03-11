import environmentRaw from '../../content/ozark-environment.json';
import type { DepthZone, EnvironmentDefinition, LakeZone, SpotDefinition, TimeOfDay, WeatherType } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function hasWeatherMultipliers(value: unknown): value is Record<WeatherType, number> {
  if (!isRecord(value)) return false;
  return (
    typeof value.sunny === 'number' &&
    typeof value.overcast === 'number' &&
    typeof value.light_rain === 'number' &&
    value.sunny > 0 &&
    value.overcast > 0 &&
    value.light_rain > 0
  );
}

function hasTimeMultipliers(value: unknown): value is Record<TimeOfDay, number> {
  if (!isRecord(value)) return false;
  return typeof value.day === 'number' && typeof value.night === 'number' && value.day > 0 && value.night > 0;
}

function hasZoneSpawnWeights(value: unknown): value is Record<LakeZone, number> {
  if (!isRecord(value)) return false;
  return (
    typeof value.shoreline === 'number' &&
    typeof value.weed_bed === 'number' &&
    typeof value.open_water === 'number' &&
    typeof value.deep_dropoff === 'number'
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function loadEnvironmentDefinition(): EnvironmentDefinition {
  const parsed = environmentRaw as unknown;
  if (!isRecord(parsed)) {
    throw new Error('ozark-environment.json must export an object.');
  }

  const depthBands = parsed.depthBands;
  const lakeDepthMap = parsed.lakeDepthMap;
  const vegetationZones = parsed.vegetationZones;
  const fishZonePreferences = parsed.fishZonePreferences;

  if (!isRecord(depthBands) || typeof depthBands.shallowMax !== 'number' || typeof depthBands.midMax !== 'number') {
    throw new Error('ozark-environment.json depthBands are invalid.');
  }
  if (
    !isRecord(lakeDepthMap) ||
    typeof lakeDepthMap.shorelineMaxX !== 'number' ||
    typeof lakeDepthMap.weedBandStartX !== 'number' ||
    typeof lakeDepthMap.weedBandEndX !== 'number' ||
    typeof lakeDepthMap.dropoffStartX !== 'number'
  ) {
    throw new Error('ozark-environment.json lakeDepthMap is invalid.');
  }
  if (!isRecord(vegetationZones) || typeof vegetationZones.weedBandDensity !== 'number' || typeof vegetationZones.shorelineDensity !== 'number') {
    throw new Error('ozark-environment.json vegetationZones are invalid.');
  }

  if (!hasWeatherMultipliers(parsed.weatherMultipliers) || !hasTimeMultipliers(parsed.timeMultipliers)) {
    throw new Error('ozark-environment.json multipliers are invalid.');
  }
  if (!hasZoneSpawnWeights(parsed.zoneSpawnWeights)) {
    throw new Error('ozark-environment.json zoneSpawnWeights are invalid.');
  }

  if (typeof parsed.baseBiteChancePerSecond !== 'number' || parsed.baseBiteChancePerSecond <= 0 || parsed.baseBiteChancePerSecond >= 1) {
    throw new Error('ozark-environment.json baseBiteChancePerSecond must be between 0 and 1.');
  }
  if (typeof parsed.waterClarity !== 'number' || parsed.waterClarity <= 0 || parsed.waterClarity > 1) {
    throw new Error('ozark-environment.json waterClarity must be in (0,1].');
  }

  if (depthBands.shallowMax <= 0 || depthBands.midMax <= depthBands.shallowMax || depthBands.midMax >= 1) {
    throw new Error('ozark-environment.json depthBands thresholds are invalid.');
  }

  if (!isRecord(fishZonePreferences)) {
    throw new Error('ozark-environment.json fishZonePreferences are invalid.');
  }

  return {
    baseBiteChancePerSecond: parsed.baseBiteChancePerSecond,
    waterClarity: parsed.waterClarity,
    weatherMultipliers: parsed.weatherMultipliers,
    timeMultipliers: parsed.timeMultipliers,
    depthBands: {
      shallowMax: depthBands.shallowMax,
      midMax: depthBands.midMax
    },
    lakeDepthMap: {
      shorelineMaxX: lakeDepthMap.shorelineMaxX,
      weedBandStartX: lakeDepthMap.weedBandStartX,
      weedBandEndX: lakeDepthMap.weedBandEndX,
      dropoffStartX: lakeDepthMap.dropoffStartX
    },
    vegetationZones: {
      weedBandDensity: vegetationZones.weedBandDensity,
      shorelineDensity: vegetationZones.shorelineDensity
    },
    zoneSpawnWeights: parsed.zoneSpawnWeights,
    fishZonePreferences: parsed.fishZonePreferences as Record<string, Partial<Record<LakeZone, number>>>
  };
}

export function resolveDepthZone(depthNorm: number, env: EnvironmentDefinition): DepthZone {
  if (depthNorm <= env.depthBands.shallowMax) return 'shallow';
  if (depthNorm <= env.depthBands.midMax) return 'mid';
  return 'deep';
}

export function resolveLakeZone(distanceNorm: number, env: EnvironmentDefinition): LakeZone {
  const d = clamp(distanceNorm, 0, 1);
  if (d <= env.lakeDepthMap.shorelineMaxX) return 'shoreline';
  if (d >= env.lakeDepthMap.weedBandStartX && d <= env.lakeDepthMap.weedBandEndX) return 'weed_bed';
  if (d >= env.lakeDepthMap.dropoffStartX) return 'deep_dropoff';
  return 'open_water';
}

export function zoneSpawnWeight(env: EnvironmentDefinition, zone: LakeZone, fishId: string, spot?: SpotDefinition): number {
  const base = env.zoneSpawnWeights[zone];
  const fishPref = env.fishZonePreferences[fishId]?.[zone] ?? 1;
  const spotZone = spot?.zoneWeights[zone] ?? 1;
  const spotBoost = spot?.fishSpawnBoosts[fishId] ?? 1;
  return base * fishPref * spotZone * spotBoost;
}

export function depthBiasForSpot(spot: SpotDefinition, depth: DepthZone): number {
  return spot.depthProfile[depth] ?? 1;
}

export function cycleWeather(current: WeatherType): WeatherType {
  if (current === 'sunny') return 'overcast';
  if (current === 'overcast') return 'light_rain';
  return 'sunny';
}

export function toggleTimeOfDay(current: TimeOfDay): TimeOfDay {
  return current === 'day' ? 'night' : 'day';
}
