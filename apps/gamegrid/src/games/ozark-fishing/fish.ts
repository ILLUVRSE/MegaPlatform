import fishRaw from '../../content/ozark-fish.json';
import { zoneSpawnWeight } from './environment';
import type {
  FishAgent,
  FishDefinition,
  FishInterestContext,
  FightStyle,
  HookQuality,
  HookedFish,
  LakeZone,
  RarityTier,
  SpotDefinition
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isFightStyle(value: unknown): value is FightStyle {
  return value === 'runner' || value === 'thrasher' || value === 'diver' || value === 'tanker';
}

function isDepth(value: unknown): value is 'shallow' | 'mid' | 'deep' {
  return value === 'shallow' || value === 'mid' || value === 'deep';
}

function isWeather(value: unknown): value is 'sunny' | 'overcast' | 'light_rain' {
  return value === 'sunny' || value === 'overcast' || value === 'light_rain';
}

function isTime(value: unknown): value is 'day' | 'night' {
  return value === 'day' || value === 'night';
}

function isSpotId(value: unknown): value is 'cove' | 'dock' | 'open-water' | 'river-mouth' {
  return value === 'cove' || value === 'dock' || value === 'open-water' || value === 'river-mouth';
}

function isSeasonId(value: unknown): value is 'spring' | 'summer' | 'fall' | 'winter' {
  return value === 'spring' || value === 'summer' || value === 'fall' || value === 'winter';
}

function isRarityTier(value: unknown): value is RarityTier {
  return value === 'Common' || value === 'Uncommon' || value === 'Rare' || value === 'Legendary';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isFishDefinition(value: unknown): value is FishDefinition {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || value.id.length === 0) return false;
  if (typeof value.name !== 'string' || value.name.length === 0) return false;
  if (!isRarityTier(value.rarityTier)) return false;
  if (typeof value.rarity !== 'number' || value.rarity <= 0) return false;
  if (typeof value.minWeightLb !== 'number' || typeof value.maxWeightLb !== 'number' || value.maxWeightLb <= value.minWeightLb) return false;
  if (!isRecord(value.weightCurve)) return false;
  if (typeof value.weightCurve.p10 !== 'number' || typeof value.weightCurve.p50 !== 'number' || typeof value.weightCurve.p90 !== 'number') return false;
  if (typeof value.difficulty !== 'number' || value.difficulty <= 0) return false;
  if (!isFightStyle(value.fightStyle)) return false;
  if (!Array.isArray(value.preferredSpots) || !value.preferredSpots.every(isSpotId)) return false;
  if (!Array.isArray(value.preferredDepths) || !value.preferredDepths.every(isDepth)) return false;
  if (!Array.isArray(value.preferredWeather) || !value.preferredWeather.every(isWeather)) return false;
  if (!Array.isArray(value.preferredTimes) || !value.preferredTimes.every(isTime)) return false;
  if (value.seasonActive !== undefined && (!Array.isArray(value.seasonActive) || !value.seasonActive.every(isSeasonId))) return false;
  return true;
}

export function loadFishCatalog(): FishDefinition[] {
  const parsed = fishRaw as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('ozark-fish.json must export an array.');
  }

  const fish = parsed.filter(isFishDefinition);
  if (fish.length < 25) {
    throw new Error(`Ozark Fishing requires at least 25 valid fish entries. Found ${fish.length}.`);
  }

  const ids = new Set<string>();
  for (let i = 0; i < fish.length; i += 1) {
    if (ids.has(fish[i].id)) {
      throw new Error(`Duplicate fish id in ozark-fish.json: ${fish[i].id}`);
    }
    ids.add(fish[i].id);
  }

  return fish;
}

export function computeFishInterestScore(context: FishInterestContext): number {
  const depthFactor = context.fish.preferredDepths.includes(context.depth) ? 1.35 : 0.62;
  const weatherFactor = context.fish.preferredWeather.includes(context.weather) ? 1.16 : 0.84;
  const timeFactor = context.fish.preferredTimes.includes(context.timeOfDay) ? 1.14 : 0.86;
  const spotFactor = context.fish.preferredSpots.includes(context.spot.id) ? 1.18 : 0.88;
  const lureDepthFactor = context.lure.preferredDepth === context.depth ? 1.12 : 0.93;
  const rarityFactor = clamp(context.fish.rarity / 24, 0.05, 1.2);

  const zoneWeight = zoneSpawnWeight(context.environment, context.zone, context.fish.id, context.spot);
  const detectRange = clamp((0.24 + context.lure.detectability * 0.2) * context.environment.waterClarity, 0.14, 0.62);
  const distancePenalty = context.lureDistanceNorm <= detectRange ? 1 : clamp(1 - (context.lureDistanceNorm - detectRange) * 1.4, 0.1, 1);
  const linePenalty = clamp(1 - context.lineVisibilityPenalty * 0.28, 0.68, 1);
  const lureAffinity = clamp(context.lure.speciesAffinity[context.fish.id] ?? 1, 0.75, 1.35);
  const spotWeather = context.spot.weatherBoosts?.[context.weather] ?? 1;
  const spotTime = context.spot.timeBoosts?.[context.timeOfDay] ?? 1;

  return depthFactor * weatherFactor * timeFactor * spotFactor * lureDepthFactor * rarityFactor * zoneWeight * distancePenalty * linePenalty * lureAffinity * spotWeather * spotTime;
}

export function createFishAgentPool(size: number): FishAgent[] {
  const pool: FishAgent[] = [];
  for (let i = 0; i < size; i += 1) {
    pool.push({
      id: `agent-${i}`,
      fish: {
        id: 'placeholder',
        name: 'Placeholder',
        rarityTier: 'Common',
        rarity: 20,
        minWeightLb: 1,
        maxWeightLb: 1.1,
        weightCurve: { p10: 1, p50: 1.05, p90: 1.09 },
        difficulty: 1,
        fightStyle: 'runner',
        preferredSpots: ['cove'],
        preferredDepths: ['shallow'],
        preferredWeather: ['sunny'],
        preferredTimes: ['day']
      },
      active: false,
      state: 'cruising',
      detectRadius: 0.2,
      interest: 0,
      hesitation: 0,
      circlingPasses: 0,
      timerSec: 0
    });
  }
  return pool;
}

function chooseWeightedFish(catalog: FishDefinition[], zone: LakeZone, spot: SpotDefinition, zoneWeightByFish: (fish: FishDefinition, zone: LakeZone, spot: SpotDefinition) => number, roll: number): FishDefinition {
  let total = 0;
  for (let i = 0; i < catalog.length; i += 1) {
    const entry = catalog[i];
    const base = (entry.rarity / 24) * zoneWeightByFish(entry, zone, spot);
    const spotAffinity = entry.preferredSpots.includes(spot.id) ? 1.2 : 0.84;
    total += Math.max(0.001, base * spotAffinity);
  }

  let r = clamp(roll, 0, 0.999999) * total;
  for (let i = 0; i < catalog.length; i += 1) {
    const entry = catalog[i];
    const base = (entry.rarity / 24) * zoneWeightByFish(entry, zone, spot);
    const spotAffinity = entry.preferredSpots.includes(spot.id) ? 1.2 : 0.84;
    r -= Math.max(0.001, base * spotAffinity);
    if (r <= 0) return entry;
  }
  return catalog[catalog.length - 1];
}

export function seedFishAgents(
  pool: FishAgent[],
  catalog: FishDefinition[],
  zone: LakeZone,
  spot: SpotDefinition,
  zoneWeightByFish: (fish: FishDefinition, zone: LakeZone, spot: SpotDefinition) => number,
  rng: () => number
): void {
  const activeCount = Math.min(pool.length, 6);
  for (let i = 0; i < pool.length; i += 1) {
    const agent = pool[i];
    if (i >= activeCount) {
      agent.active = false;
      agent.state = 'cruising';
      continue;
    }

    const fish = chooseWeightedFish(catalog, zone, spot, zoneWeightByFish, rng());
    agent.active = true;
    agent.fish = fish;
    agent.state = 'cruising';
    agent.detectRadius = 0.18 + rng() * 0.18;
    agent.interest = 0;
    agent.hesitation = 0;
    agent.circlingPasses = 0;
    agent.timerSec = 0.08 + rng() * 0.24;
  }
}

export function stepFishAiAgents(
  pool: FishAgent[],
  contextByFishId: (fish: FishDefinition) => FishInterestContext,
  dtSec: number,
  rng: () => number
): FishAgent | null {
  for (let i = 0; i < pool.length; i += 1) {
    const agent = pool[i];
    if (!agent.active) continue;

    const ctx = contextByFishId(agent.fish);
    const interestScore = computeFishInterestScore(ctx);
    agent.interest = interestScore;

    const detected = ctx.lureDistanceNorm <= agent.detectRadius;
    agent.timerSec -= dtSec;
    if (agent.timerSec > 0) continue;

    if (agent.state === 'cruising') {
      if (detected && rng() < clamp(interestScore * 0.16, 0.02, 0.9)) {
        agent.state = 'interested';
        agent.hesitation = clamp(1.25 - interestScore * 0.2 + rng() * 0.4, 0.15, 1.6);
      }
      agent.timerSec = 0.2 + rng() * 0.24;
      continue;
    }

    if (agent.state === 'interested') {
      agent.hesitation -= dtSec * (0.66 + interestScore * 0.12);
      if (agent.hesitation <= 0) {
        agent.state = 'investigating';
      }
      agent.timerSec = 0.1 + rng() * 0.2;
      continue;
    }

    if (agent.state === 'investigating') {
      const hesitationGate = clamp(0.22 + (1.3 - interestScore) * 0.22, 0.08, 0.55);
      if (rng() < hesitationGate) {
        agent.state = 'cruising';
        agent.timerSec = 0.3 + rng() * 0.2;
        continue;
      }

      if (agent.fish.id === 'ozark-muskie') {
        agent.circlingPasses += 1;
        if (agent.circlingPasses < 3) {
          agent.timerSec = 0.16 + rng() * 0.12;
          continue;
        }
      }

      agent.state = 'strike';
      return agent;
    }
  }

  return null;
}

function sampleWeightFromCurve(fish: FishDefinition, rng01: number): number {
  const r = clamp(rng01, 0, 1);
  const c = fish.weightCurve;
  const min = fish.minWeightLb;
  const max = fish.maxWeightLb;

  if (r < 0.1) {
    const t = r / 0.1;
    return min + (c.p10 - min) * t;
  }
  if (r < 0.5) {
    const t = (r - 0.1) / 0.4;
    return c.p10 + (c.p50 - c.p10) * t;
  }
  if (r < 0.9) {
    const t = (r - 0.5) / 0.4;
    return c.p50 + (c.p90 - c.p50) * t;
  }
  const t = (r - 0.9) / 0.1;
  return c.p90 + (max - c.p90) * t;
}

export function createHookedFish(fish: FishDefinition, quality: HookQuality, rng01: number): HookedFish {
  const weightLb = sampleWeightFromCurve(fish, rng01);

  const staminaQualityScale = quality === 'perfect' ? 0.86 : quality === 'good' ? 1 : 1.2;
  const aggressionQualityBoost = quality === 'perfect' ? 0.9 : quality === 'good' ? 1 : 1.18;
  const escapeRisk = quality === 'perfect' ? 0.06 : quality === 'good' ? 0.1 : 0.19;

  const staminaMax = (30 + fish.difficulty * 36 + weightLb * 1.2) * staminaQualityScale;

  return {
    fish,
    weightLb,
    staminaMax,
    stamina: staminaMax,
    pullBias: 0.42 + fish.difficulty * 0.24,
    aggression: (0.55 + fish.difficulty * 0.28) * aggressionQualityBoost,
    escapeRisk,
    style: fish.fightStyle,
    behaviorTimerSec: 0.35,
    behavior: 'calm',
    aiState: 'hooked'
  };
}

export function stepFishBehavior(hooked: HookedFish, dtSec: number, rng01: number): { fish: HookedFish; pullForce: number } {
  const next: HookedFish = { ...hooked };
  next.behaviorTimerSec -= dtSec;

  if (next.behaviorTimerSec <= 0) {
    const roll = clamp(rng01, 0, 1);
    if (next.style === 'tanker') {
      next.behavior = roll < 0.6 ? 'dive' : 'calm';
    } else if (next.style === 'diver') {
      next.behavior = roll < 0.5 ? 'dive' : roll < 0.8 ? 'run_left' : 'calm';
    } else if (next.style === 'thrasher') {
      next.behavior = roll < 0.58 ? 'thrash' : roll < 0.8 ? 'run_left' : 'calm';
    } else {
      next.behavior = roll < 0.38 ? 'run_left' : roll < 0.72 ? 'run_right' : 'thrash';
    }

    next.behaviorTimerSec = 0.2 + (1 - clamp(next.stamina / Math.max(1, next.staminaMax), 0, 1)) * 0.5;
  }

  let pull = next.pullBias;
  if (next.behavior === 'thrash') pull += 0.36 * next.aggression;
  if (next.behavior === 'run_left' || next.behavior === 'run_right') pull += 0.24 * next.aggression;
  if (next.behavior === 'dive') pull += 0.42 * next.aggression;

  const staminaNorm = clamp(next.stamina / Math.max(1, next.staminaMax), 0, 1);
  const staminaFactor = 0.52 + staminaNorm * 0.7;
  pull *= staminaFactor;

  if (next.stamina <= next.staminaMax * 0.12) {
    next.aiState = 'exhausted';
  }

  return { fish: next, pullForce: pull };
}

export function transitionHookedFishState(
  fish: HookedFish,
  outcome: 'active' | 'landed' | 'snapped' | 'escaped',
  rng: () => number
): HookedFish {
  if (outcome === 'escaped') {
    return {
      ...fish,
      aiState: 'escape',
      behavior: rng() < 0.5 ? 'run_left' : 'run_right',
      behaviorTimerSec: 0.18
    };
  }

  if (outcome === 'landed') {
    return {
      ...fish,
      aiState: 'exhausted',
      behavior: 'calm',
      behaviorTimerSec: 0
    };
  }

  if (outcome === 'snapped') {
    return {
      ...fish,
      aiState: 'escape',
      behavior: 'thrash',
      behaviorTimerSec: 0.12
    };
  }

  return fish;
}
