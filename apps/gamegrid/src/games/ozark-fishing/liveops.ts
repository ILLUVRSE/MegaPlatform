import eventsRaw from '../../content/ozark-events.json';
import legendariesRaw from '../../content/ozark-legendaries.json';
import seasonsRaw from '../../content/ozark-seasons.json';
import type { LakeZone, WeatherType } from './types';

export type SeasonId = 'spring' | 'summer' | 'fall' | 'winter';

export interface SeasonDefinition {
  id: SeasonId;
  name: string;
  fishBoosts: Record<string, number>;
  weatherOdds: Record<WeatherType, number>;
  visualTheme: {
    tint: string;
    particle: string;
  };
}

export interface WeeklyEventDefinition {
  id: string;
  name: string;
  description: string;
  fishBoosts: Record<string, number>;
  biteRateMultiplier: number;
  rarityOddsMultiplier: number;
  nightMultiplier?: number;
  weatherRequired?: WeatherType;
  weatherOverrides?: Partial<Record<WeatherType, number>>;
  zoneBoosts?: Partial<Record<LakeZone, number>>;
  scoring?: {
    bigCatchBonus?: number;
    derbyWeightBonus?: number;
    durationSecOverride?: number;
  };
}

export interface LegendaryRule {
  legendaryId: string;
  name: string;
  requiredSeasons: SeasonId[];
  requiredEvents: string[];
  spawnOdds: number;
  behaviorTags: string[];
}

export interface SightingHint {
  legendaryId: string;
  text: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function asSeasonId(value: unknown): SeasonId | null {
  if (value === 'spring' || value === 'summer' || value === 'fall' || value === 'winter') return value;
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function isSeasonDefinition(value: unknown): value is SeasonDefinition {
  if (!isRecord(value)) return false;
  if (!asSeasonId(value.id)) return false;
  if (typeof value.name !== 'string') return false;
  if (!isRecord(value.fishBoosts) || !Object.values(value.fishBoosts).every((v) => typeof v === 'number')) return false;
  if (!isRecord(value.weatherOdds)) return false;
  if (typeof value.weatherOdds.sunny !== 'number' || typeof value.weatherOdds.overcast !== 'number' || typeof value.weatherOdds.light_rain !== 'number') return false;
  if (!isRecord(value.visualTheme) || typeof value.visualTheme.tint !== 'string' || typeof value.visualTheme.particle !== 'string') return false;
  return true;
}

export function loadSeasonCatalog(): { dateMapping: Record<SeasonId, number[]>; seasons: SeasonDefinition[] } {
  const parsed = seasonsRaw as unknown;
  if (!isRecord(parsed)) throw new Error('ozark-seasons.json must be an object.');
  if (!isRecord(parsed.dateMapping)) throw new Error('ozark-seasons.json dateMapping missing.');

  const dateMapping: Record<SeasonId, number[]> = {
    spring: Array.isArray(parsed.dateMapping.spring) ? parsed.dateMapping.spring.map((v) => Number(v)) : [],
    summer: Array.isArray(parsed.dateMapping.summer) ? parsed.dateMapping.summer.map((v) => Number(v)) : [],
    fall: Array.isArray(parsed.dateMapping.fall) ? parsed.dateMapping.fall.map((v) => Number(v)) : [],
    winter: Array.isArray(parsed.dateMapping.winter) ? parsed.dateMapping.winter.map((v) => Number(v)) : []
  };

  const seasons = Array.isArray(parsed.seasons) ? parsed.seasons.filter(isSeasonDefinition) : [];
  if (seasons.length !== 4) throw new Error(`ozark-seasons requires 4 valid seasons. Found ${seasons.length}.`);

  return { dateMapping, seasons };
}

function isEventDefinition(value: unknown): value is WeeklyEventDefinition {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || typeof value.name !== 'string' || typeof value.description !== 'string') return false;
  if (!isRecord(value.fishBoosts) || !Object.values(value.fishBoosts).every((v) => typeof v === 'number')) return false;
  if (typeof value.biteRateMultiplier !== 'number' || typeof value.rarityOddsMultiplier !== 'number') return false;
  return true;
}

export function loadWeeklyEvents(): WeeklyEventDefinition[] {
  const parsed = eventsRaw as unknown;
  if (!Array.isArray(parsed)) throw new Error('ozark-events.json must be an array.');
  const events = parsed.filter(isEventDefinition);
  if (events.length < 8) throw new Error(`ozark-events requires at least 8 valid events. Found ${events.length}.`);
  return events;
}

function isLegendaryRule(value: unknown): value is LegendaryRule {
  if (!isRecord(value)) return false;
  if (typeof value.legendaryId !== 'string' || typeof value.name !== 'string') return false;
  if (!Array.isArray(value.requiredSeasons) || !value.requiredSeasons.every((s) => asSeasonId(s) !== null)) return false;
  if (!Array.isArray(value.requiredEvents) || !value.requiredEvents.every((s) => typeof s === 'string')) return false;
  if (typeof value.spawnOdds !== 'number' || value.spawnOdds <= 0) return false;
  if (!Array.isArray(value.behaviorTags) || !value.behaviorTags.every((s) => typeof s === 'string')) return false;
  return true;
}

export function loadLegendaryRules(): LegendaryRule[] {
  const parsed = legendariesRaw as unknown;
  if (!Array.isArray(parsed)) throw new Error('ozark-legendaries.json must be an array.');
  const rules = parsed.filter(isLegendaryRule);
  if (rules.length < 3) throw new Error(`ozark-legendaries requires at least 3 entries. Found ${rules.length}.`);
  return rules;
}

export function seasonIdForDate(date: Date, mapping: Record<SeasonId, number[]>): SeasonId {
  const month = date.getUTCMonth() + 1;
  for (const id of ['spring', 'summer', 'fall', 'winter'] as SeasonId[]) {
    if (mapping[id].includes(month)) return id;
  }
  return 'spring';
}

export function getSeasonForDate(date: Date, catalog: { dateMapping: Record<SeasonId, number[]>; seasons: SeasonDefinition[] }): SeasonDefinition {
  const id = seasonIdForDate(date, catalog.dateMapping);
  return catalog.seasons.find((season) => season.id === id) ?? catalog.seasons[0];
}

export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function pickWeeklyEvent(weekKey: string, events: WeeklyEventDefinition[], seed = 0): WeeklyEventDefinition {
  const idx = stableHash(`${weekKey}:${seed}`) % events.length;
  return events[idx];
}

export function spawnWeightWithSeasonEvent(baseWeight: number, fishId: string, zone: LakeZone, season: SeasonDefinition, event: WeeklyEventDefinition | null): number {
  const seasonBoost = season.fishBoosts[fishId] ?? 1;
  const eventBoost = event?.fishBoosts[fishId] ?? 1;
  const zoneBoost = event?.zoneBoosts?.[zone] ?? 1;
  return baseWeight * seasonBoost * eventBoost * zoneBoost;
}

export function weatherOddsForSeasonEvent(season: SeasonDefinition, event: WeeklyEventDefinition | null): Record<WeatherType, number> {
  const out: Record<WeatherType, number> = {
    sunny: season.weatherOdds.sunny,
    overcast: season.weatherOdds.overcast,
    light_rain: season.weatherOdds.light_rain
  };
  if (event?.weatherOverrides) {
    if (typeof event.weatherOverrides.sunny === 'number') out.sunny = event.weatherOverrides.sunny;
    if (typeof event.weatherOverrides.overcast === 'number') out.overcast = event.weatherOverrides.overcast;
    if (typeof event.weatherOverrides.light_rain === 'number') out.light_rain = event.weatherOverrides.light_rain;
  }
  return out;
}

export function isIceFishingAvailable(season: SeasonId, sandboxAllowIce: boolean): boolean {
  return season === 'winter' || sandboxAllowIce;
}

export function jigPatternInfluence(intervalsMs: number[]): number {
  if (intervalsMs.length < 2) return 0.92;
  let variance = 0;
  let sum = 0;
  for (let i = 0; i < intervalsMs.length; i += 1) sum += intervalsMs[i];
  const mean = sum / intervalsMs.length;
  for (let i = 0; i < intervalsMs.length; i += 1) variance += Math.abs(intervalsMs[i] - mean);
  const norm = variance / (intervalsMs.length * Math.max(1, mean));
  return clamp(1.18 - norm * 0.55, 0.85, 1.22);
}

export function eligibleLegendaries(rules: LegendaryRule[], seasonId: SeasonId, eventId: string | null): LegendaryRule[] {
  return rules.filter((rule) => rule.requiredSeasons.includes(seasonId) && (!!eventId && rule.requiredEvents.includes(eventId)));
}

export function deterministicSighting(weekKey: string, seed: number, eligibles: LegendaryRule[]): SightingHint | null {
  if (eligibles.length === 0) return null;
  const idx = stableHash(`${weekKey}:${seed}:sighting`) % eligibles.length;
  const roll = stableHash(`${weekKey}:${seed}:zone`) % 3;
  const zone = roll === 0 ? 'Deep Drop-Off' : roll === 1 ? 'Open Water' : 'River Mouth';
  const time = (stableHash(`${weekKey}:${seed}:time`) % 2) === 0 ? 'Night' : 'Day';
  const pick = eligibles[idx];
  return {
    legendaryId: pick.legendaryId,
    text: `${pick.name} spotted near ${zone} at ${time}`
  };
}
