import challengesRaw from '../../content/ozark-challenges.json';
import cosmeticsRaw from '../../content/ozark-cosmetics.json';
import fishVisualsRaw from '../../content/ozark-fish-visuals.json';
import gearRaw from '../../content/ozark-gear.json';
import spotsRaw from '../../content/ozark-spots.json';
import type {
  BobberSkinDefinition,
  ChallengeTemplate,
  CosmeticsCatalog,
  DepthZone,
  FishVisualDefinition,
  LineDefinition,
  LakeZone,
  LureSkinDefinition,
  ReelDefinition,
  RodDefinition,
  SpotDefinition,
  TimeOfDay,
  WeatherType
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isSpotId(value: unknown): value is SpotDefinition['id'] {
  return value === 'cove' || value === 'dock' || value === 'open-water' || value === 'river-mouth';
}

function isZone(value: unknown): value is LakeZone {
  return value === 'shoreline' || value === 'weed_bed' || value === 'open_water' || value === 'deep_dropoff';
}

function isWeather(value: unknown): value is WeatherType {
  return value === 'sunny' || value === 'overcast' || value === 'light_rain';
}

function isTime(value: unknown): value is TimeOfDay {
  return value === 'day' || value === 'night';
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  if (!isRecord(value)) return false;
  return Object.values(value).every((v) => typeof v === 'number');
}

function hasZoneWeights(value: unknown): value is Record<LakeZone, number> {
  if (!isRecord(value)) return false;
  return isZone('shoreline') && typeof value.shoreline === 'number' && typeof value.weed_bed === 'number' && typeof value.open_water === 'number' && typeof value.deep_dropoff === 'number';
}

function hasDepthProfile(value: unknown): value is Record<DepthZone, number> {
  if (!isRecord(value)) return false;
  return typeof value.shallow === 'number' && typeof value.mid === 'number' && typeof value.deep === 'number';
}

function isSpotDefinition(value: unknown): value is SpotDefinition {
  if (!isRecord(value)) return false;
  if (!isSpotId(value.id)) return false;
  if (typeof value.name !== 'string' || !value.name) return false;
  if (typeof value.description !== 'string' || !value.description) return false;
  if (typeof value.unlockLevel !== 'number' || value.unlockLevel < 1) return false;
  if (!hasZoneWeights(value.zoneWeights)) return false;
  if (!hasDepthProfile(value.depthProfile)) return false;
  if (!isNumberRecord(value.fishSpawnBoosts)) return false;
  if (value.weatherBoosts !== undefined && (!isRecord(value.weatherBoosts) || !Object.entries(value.weatherBoosts).every(([k, v]) => isWeather(k) && typeof v === 'number'))) {
    return false;
  }
  if (value.timeBoosts !== undefined && (!isRecord(value.timeBoosts) || !Object.entries(value.timeBoosts).every(([k, v]) => isTime(k) && typeof v === 'number'))) {
    return false;
  }
  return true;
}

export function loadSpotCatalog(): SpotDefinition[] {
  const parsed = spotsRaw as unknown;
  if (!Array.isArray(parsed)) throw new Error('ozark-spots.json must export an array.');

  const spots = parsed.filter(isSpotDefinition);
  if (spots.length < 4) throw new Error(`Ozark Fishing requires at least 4 valid spots. Found ${spots.length}.`);

  const ids = new Set<string>();
  for (let i = 0; i < spots.length; i += 1) {
    if (ids.has(spots[i].id)) throw new Error(`Duplicate spot id in ozark-spots.json: ${spots[i].id}`);
    ids.add(spots[i].id);
  }

  return spots;
}

function isRod(value: unknown): value is RodDefinition {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.tier === 'number' &&
    typeof value.unlockLevel === 'number' &&
    typeof value.flexDamping === 'number' &&
    typeof value.hookForgiveness === 'number' &&
    typeof value.tensionControl === 'number'
  );
}

function isReel(value: unknown): value is ReelDefinition {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.tier === 'number' &&
    typeof value.unlockLevel === 'number' &&
    typeof value.dragStability === 'number' &&
    typeof value.reelSpeed === 'number' &&
    typeof value.slackRecovery === 'number'
  );
}

function isLine(value: unknown): value is LineDefinition {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.tier === 'number' &&
    typeof value.unlockLevel === 'number' &&
    typeof value.snapThreshold === 'number' &&
    typeof value.visibility === 'number' &&
    typeof value.abrasionResistance === 'number'
  );
}

export function loadGearCatalog(): { rods: RodDefinition[]; reels: ReelDefinition[]; lines: LineDefinition[] } {
  const parsed = gearRaw as unknown;
  if (!isRecord(parsed)) throw new Error('ozark-gear.json must export an object.');

  const rods = Array.isArray(parsed.rods) ? parsed.rods.filter(isRod) : [];
  const reels = Array.isArray(parsed.reels) ? parsed.reels.filter(isReel) : [];
  const lines = Array.isArray(parsed.lines) ? parsed.lines.filter(isLine) : [];

  if (rods.length < 5) throw new Error(`Ozark Fishing requires at least 5 rods. Found ${rods.length}.`);
  if (reels.length < 5) throw new Error(`Ozark Fishing requires at least 5 reels. Found ${reels.length}.`);
  if (lines.length < 4) throw new Error(`Ozark Fishing requires at least 4 lines. Found ${lines.length}.`);

  return { rods, reels, lines };
}

function isChallengeTemplate(value: unknown): value is ChallengeTemplate {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || typeof value.name !== 'string' || typeof value.description !== 'string') return false;
  if (
    value.kind !== 'catch_count_spot' &&
    value.kind !== 'catch_rare_time' &&
    value.kind !== 'land_runner_clean' &&
    value.kind !== 'catch_total_weight' &&
    value.kind !== 'spot_variety' &&
    value.kind !== 'land_trophy_weight'
  ) {
    return false;
  }
  if (!Array.isArray(value.targets) || value.targets.length === 0 || !value.targets.every((n) => typeof n === 'number' && n > 0)) return false;
  if (!Array.isArray(value.xpReward) || value.xpReward.length === 0 || !value.xpReward.every((n) => typeof n === 'number' && n > 0)) return false;
  return true;
}

export function loadChallengeTemplates(): ChallengeTemplate[] {
  const parsed = challengesRaw as unknown;
  if (!Array.isArray(parsed)) throw new Error('ozark-challenges.json must export an array.');
  const templates = parsed.filter(isChallengeTemplate);
  if (templates.length < 6) throw new Error(`Ozark Fishing requires at least 6 challenge templates. Found ${templates.length}.`);
  return templates;
}

export function resolveSpotById(spots: SpotDefinition[], id: string): SpotDefinition {
  return spots.find((spot) => spot.id === id) ?? spots[0];
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

function isUnlockRule(value: unknown): value is BobberSkinDefinition['unlock'] {
  return (
    isRecord(value) &&
    (value.type === 'level' || value.type === 'challenge' || value.type === 'season_reward') &&
    (typeof value.value === 'number' || typeof value.value === 'string')
  );
}

function isBobberSkinDefinition(value: unknown): value is BobberSkinDefinition {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.style === 'split' || value.style === 'ring' || value.style === 'dot' || value.style === 'stripe') &&
    isHexColor(value.primaryColor) &&
    isHexColor(value.secondaryColor) &&
    isHexColor(value.ringColor) &&
    isUnlockRule(value.unlock)
  );
}

function isLureSkinDefinition(value: unknown): value is LureSkinDefinition {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    Array.isArray(value.lureTags) &&
    value.lureTags.every((entry) => typeof entry === 'string') &&
    Array.isArray(value.palette) &&
    value.palette.length === 2 &&
    isHexColor(value.palette[0]) &&
    isHexColor(value.palette[1]) &&
    isUnlockRule(value.unlock)
  );
}

export function loadCosmeticsCatalog(): CosmeticsCatalog {
  const parsed = cosmeticsRaw as unknown;
  if (!isRecord(parsed)) throw new Error('ozark-cosmetics.json must export an object.');
  const bobberSkins = Array.isArray(parsed.bobberSkins) ? parsed.bobberSkins.filter(isBobberSkinDefinition) : [];
  const lureSkins = Array.isArray(parsed.lureSkins) ? parsed.lureSkins.filter(isLureSkinDefinition) : [];
  if (bobberSkins.length < 10) throw new Error(`Ozark Fishing requires at least 10 bobber skins. Found ${bobberSkins.length}.`);
  if (lureSkins.length < 15) throw new Error(`Ozark Fishing requires at least 15 lure skins. Found ${lureSkins.length}.`);
  return { bobberSkins, lureSkins };
}

function isFishVisualDefinition(value: unknown): value is FishVisualDefinition {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.baseColors) || value.baseColors.length !== 2 || !isHexColor(value.baseColors[0]) || !isHexColor(value.baseColors[1])) return false;
  if (!Array.isArray(value.patternAccents) || value.patternAccents.length !== 2 || !isHexColor(value.patternAccents[0]) || !isHexColor(value.patternAccents[1])) return false;
  if (
    value.silhouette !== 'bass' &&
    value.silhouette !== 'panfish' &&
    value.silhouette !== 'catfish' &&
    value.silhouette !== 'gar' &&
    value.silhouette !== 'trout' &&
    value.silhouette !== 'walleye' &&
    value.silhouette !== 'carp' &&
    value.silhouette !== 'muskie' &&
    value.silhouette !== 'paddlefish'
  ) {
    return false;
  }
  if (
    !isRecord(value.spriteKeys) ||
    typeof value.spriteKeys.idle !== 'string' ||
    typeof value.spriteKeys.bite !== 'string' ||
    typeof value.spriteKeys.thrash !== 'string' ||
    typeof value.spriteKeys.exhausted !== 'string'
  ) {
    return false;
  }
  if (
    !isRecord(value.animSpeed) ||
    typeof value.animSpeed.idle !== 'number' ||
    typeof value.animSpeed.bite !== 'number' ||
    typeof value.animSpeed.thrash !== 'number' ||
    typeof value.animSpeed.exhausted !== 'number'
  ) {
    return false;
  }
  if (
    !isRecord(value.sizeScaleByPercentile) ||
    typeof value.sizeScaleByPercentile.p10 !== 'number' ||
    typeof value.sizeScaleByPercentile.p50 !== 'number' ||
    typeof value.sizeScaleByPercentile.p90 !== 'number' ||
    typeof value.sizeScaleByPercentile.p95 !== 'number'
  ) {
    return false;
  }
  return isRecord(value.rarityEffects) && (value.rarityEffects.aura === 'none' || value.rarityEffects.aura === 'mist' || value.rarityEffects.aura === 'gold');
}

export function loadFishVisualCatalog(): Record<string, FishVisualDefinition> {
  const parsed = fishVisualsRaw as unknown;
  if (!isRecord(parsed)) throw new Error('ozark-fish-visuals.json must export an object.');
  const out: Record<string, FishVisualDefinition> = {};
  for (const [fishId, config] of Object.entries(parsed)) {
    if (!isFishVisualDefinition(config)) continue;
    out[fishId] = config;
  }
  if (Object.keys(out).length < 25) throw new Error(`Ozark Fishing requires fish visuals for at least 25 species. Found ${Object.keys(out).length}.`);
  return out;
}
