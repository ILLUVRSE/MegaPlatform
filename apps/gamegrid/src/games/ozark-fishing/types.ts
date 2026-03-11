export type OzarkMode = 'free_fish' | 'timed_derby' | 'big_catch' | 'ice_fishing';
export type WeatherType = 'sunny' | 'overcast' | 'light_rain';
export type TimeOfDay = 'day' | 'night';
export type DepthZone = 'shallow' | 'mid' | 'deep';
export type LakeZone = 'shoreline' | 'weed_bed' | 'open_water' | 'deep_dropoff';
export type SpotId = 'cove' | 'dock' | 'open-water' | 'river-mouth';
export type FightStyle = 'runner' | 'thrasher' | 'diver' | 'tanker';
export type FishAIState = 'cruising' | 'interested' | 'investigating' | 'strike' | 'hooked' | 'exhausted' | 'escape';

export type RarityTier = 'Common' | 'Uncommon' | 'Rare' | 'Legendary';

export interface WeightCurve {
  p10: number;
  p50: number;
  p90: number;
}

export interface FishDefinition {
  id: string;
  name: string;
  rarityTier: RarityTier;
  rarity: number;
  minWeightLb: number;
  maxWeightLb: number;
  weightCurve: WeightCurve;
  difficulty: number;
  fightStyle: FightStyle;
  preferredSpots: SpotId[];
  preferredDepths: DepthZone[];
  preferredWeather: WeatherType[];
  preferredTimes: TimeOfDay[];
  seasonActive?: Array<'spring' | 'summer' | 'fall' | 'winter'>;
}

export interface LureDefinition {
  id: string;
  name: string;
  sinkRate: number;
  biteMultiplier: number;
  preferredDepth: DepthZone;
  detectability: number;
  depthBehavior: string;
  speciesAffinity: Record<string, number>;
}

export interface FishVisualDefinition {
  baseColors: [string, string];
  patternAccents: [string, string];
  silhouette: 'bass' | 'panfish' | 'catfish' | 'gar' | 'trout' | 'walleye' | 'carp' | 'muskie' | 'paddlefish';
  spriteKeys: {
    idle: string;
    bite: string;
    thrash: string;
    exhausted: string;
  };
  animSpeed: {
    idle: number;
    bite: number;
    thrash: number;
    exhausted: number;
  };
  sizeScaleByPercentile: {
    p10: number;
    p50: number;
    p90: number;
    p95: number;
  };
  rarityEffects: {
    aura: 'none' | 'mist' | 'gold';
  };
}

export interface CosmeticUnlockRule {
  type: 'level' | 'challenge' | 'season_reward';
  value: number | string;
}

export interface BobberSkinDefinition {
  id: string;
  name: string;
  style: 'split' | 'ring' | 'dot' | 'stripe';
  primaryColor: string;
  secondaryColor: string;
  ringColor: string;
  unlock: CosmeticUnlockRule;
}

export interface LureSkinDefinition {
  id: string;
  name: string;
  lureTags: string[];
  palette: [string, string];
  unlock: CosmeticUnlockRule;
}

export interface CosmeticsCatalog {
  bobberSkins: BobberSkinDefinition[];
  lureSkins: LureSkinDefinition[];
}

export interface RodDefinition {
  id: string;
  name: string;
  tier: number;
  unlockLevel: number;
  flexDamping: number;
  hookForgiveness: number;
  tensionControl: number;
}

export interface ReelDefinition {
  id: string;
  name: string;
  tier: number;
  unlockLevel: number;
  dragStability: number;
  reelSpeed: number;
  slackRecovery: number;
}

export interface LineDefinition {
  id: string;
  name: string;
  tier: number;
  unlockLevel: number;
  snapThreshold: number;
  visibility: number;
  abrasionResistance: number;
}

export interface SpotDefinition {
  id: SpotId;
  name: string;
  description: string;
  unlockLevel: number;
  zoneWeights: Record<LakeZone, number>;
  depthProfile: Record<DepthZone, number>;
  fishSpawnBoosts: Record<string, number>;
  weatherBoosts?: Partial<Record<WeatherType, number>>;
  timeBoosts?: Partial<Record<TimeOfDay, number>>;
}

export interface ChallengeTemplate {
  id: string;
  name: string;
  description: string;
  kind: 'catch_count_spot' | 'catch_rare_time' | 'land_runner_clean' | 'catch_total_weight' | 'spot_variety' | 'land_trophy_weight';
  targets: number[];
  xpReward: number[];
}

export interface DailyChallenge {
  challengeId: string;
  name: string;
  description: string;
  kind: ChallengeTemplate['kind'];
  target: number;
  progress: number;
  completed: boolean;
  xpReward: number;
  metadata: {
    spotId?: SpotId;
    timeOfDay?: TimeOfDay;
    thresholdWeightLb?: number;
  };
}

export interface LakeDepthMap {
  shorelineMaxX: number;
  weedBandStartX: number;
  weedBandEndX: number;
  dropoffStartX: number;
}

export interface VegetationZones {
  weedBandDensity: number;
  shorelineDensity: number;
}

export interface EnvironmentDefinition {
  baseBiteChancePerSecond: number;
  waterClarity: number;
  weatherMultipliers: Record<WeatherType, number>;
  timeMultipliers: Record<TimeOfDay, number>;
  depthBands: {
    shallowMax: number;
    midMax: number;
  };
  lakeDepthMap: LakeDepthMap;
  vegetationZones: VegetationZones;
  zoneSpawnWeights: Record<LakeZone, number>;
  fishZonePreferences: Record<string, Partial<Record<LakeZone, number>>>;
}

export interface CastResult {
  power: number;
  distanceNorm: number;
  aimOffset: number;
}

export interface BiteContext {
  lure: LureDefinition;
  depth: DepthZone;
  zone: LakeZone;
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  fish: FishDefinition;
  environment: EnvironmentDefinition;
  spot: SpotDefinition;
  lineVisibilityPenalty: number;
}

export interface FishInterestContext extends BiteContext {
  lureDistanceNorm: number;
}

export type HookQuality = 'poor' | 'good' | 'perfect';

export interface HookResult {
  success: boolean;
  quality: HookQuality;
  offsetMs: number;
}

export type ReelOutcome = 'active' | 'landed' | 'snapped' | 'escaped';

export interface ReelState {
  tension: number;
  lineTightness: number;
  fishStamina: number;
  slackMs: number;
  notReelingMs: number;
  outcome: ReelOutcome;
}

export interface ReelStepInput {
  dtSec: number;
  reelPower: number;
  fishPull: number;
  rodFlexMultiplier: number;
  dragSetting: number;
  snapThresholdMultiplier?: number;
  slackRecoveryMultiplier?: number;
}

export interface HookedFish {
  fish: FishDefinition;
  weightLb: number;
  staminaMax: number;
  stamina: number;
  pullBias: number;
  aggression: number;
  escapeRisk: number;
  style: FightStyle;
  behaviorTimerSec: number;
  behavior: 'calm' | 'thrash' | 'run_left' | 'run_right' | 'dive';
  aiState: FishAIState;
}

export interface FishAgent {
  id: string;
  fish: FishDefinition;
  active: boolean;
  state: FishAIState;
  detectRadius: number;
  interest: number;
  hesitation: number;
  circlingPasses: number;
  timerSec: number;
}

export interface CatchRecord {
  fishId: string;
  fishName: string;
  weightLb: number;
  xp: number;
  rarityTier: RarityTier;
  timestamp: number;
  spotId: SpotId;
  weather: WeatherType;
  timeOfDay: TimeOfDay;
}

export interface TrophyEntry {
  fishId: string;
  fishName: string;
  rarityTier: RarityTier;
  bestWeightLb: number;
  countCaught: number;
  lastCaughtAt: number;
  caughtSpots: SpotId[];
  caughtTimes: TimeOfDay[];
  caughtWeather: WeatherType[];
}

export interface LoadoutState {
  rodId: string;
  reelId: string;
  lineId: string;
  lureId: string;
}

export interface InventoryState {
  rods: string[];
  reels: string[];
  lines: string[];
  lures: string[];
}

export interface CosmeticSelectionState {
  bobberSkinId: string;
  lureSkinByLureId: Record<string, string>;
}

export interface WeeklyTournamentState {
  weekKey: string;
  bestDerbyWeightLb: number;
  bestAt: number;
}

export interface LakeStatsState {
  totalFishCaught: number;
  speciesCatchCounts: Record<string, number>;
  speciesWeightTotals: Record<string, number>;
  averageWeightBySpecies: Record<string, number>;
  mostCaughtSpecies: string;
  legendaryCount: number;
  longestFightDurationMs: number;
  highestTensionSurvived: number;
  bestDerbyFinish: number;
}

export interface ReplaySampleState {
  tMs: number;
  reelPower: number;
  tension: number;
  fishStamina: number;
}

export interface ReplayState {
  id: string;
  createdAt: number;
  fishId: string;
  fishName: string;
  rarityTier: RarityTier;
  weightLb: number;
  spotId: SpotId;
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  playerLevel: number;
  seed: number;
  hookQuality: HookQuality;
  initialFishStamina: number;
  finalFishStamina: number;
  maxTension: number;
  fightDurationMs: number;
  eventLog: CastSessionEvent[];
  samples: ReplaySampleState[];
}

export interface HighlightState {
  id: string;
  createdAt: number;
  type: 'biggest_fish' | 'rarest_fish' | 'dramatic_fight';
  title: string;
  fishId: string;
  fishName: string;
  weightLb: number;
  rarityTier: RarityTier;
  replayId?: string;
  value: number;
}

export interface SeasonWeeklyRecord {
  weekKey: string;
  bestDerbyWeightLb: number;
  bestBigCatchLb: number;
  raresCaught: number;
}

export interface SeasonStanding {
  seasonId: string;
  weeklyRecords: SeasonWeeklyRecord[];
  earnedRewards: string[];
}

export interface ProgressionState {
  xp: number;
  level: number;
  rodsUnlocked: number;
  reelsUnlocked: number;
  linesUnlocked: number;
  luresUnlocked: number;
  catches: CatchRecord[];
  personalBestBySpecies: Record<string, number>;
  lifetimeWeightLb: number;
  inventory: InventoryState;
  loadout: LoadoutState;
  cosmetics: CosmeticSelectionState;
  trophies: Record<string, TrophyEntry>;
  daily: {
    dateKey: string;
    seed: number;
    challenges: DailyChallenge[];
  };
  weeklyTournament: WeeklyTournamentState;
  replays: ReplayState[];
  highlights: HighlightState[];
  lakeStats: LakeStatsState;
  seasons: SeasonStanding[];
}

export interface UnlockThreshold {
  level: number;
  rodsUnlocked: number;
  reelsUnlocked: number;
  linesUnlocked: number;
  luresUnlocked: number;
}

export interface CastSessionEvent {
  tMs: number;
  type: 'cast' | 'bite' | 'hook' | 'reel';
  payload: Record<string, number | string | boolean>;
}

export interface CastSessionState {
  seed: number;
  rngState: number;
  reelState: ReelState;
  fishPull: number;
  fishStaminaMax: number;
  eventLog: CastSessionEvent[];
}
