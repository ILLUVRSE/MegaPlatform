import { loadChallengeTemplates, loadCosmeticsCatalog, loadGearCatalog, loadSpotCatalog } from './content';
import type { SessionHighlight } from './highlights';
import { addHighlightsToProgression } from './highlights';
import { createDefaultLakeStats, updateLakeStatsFromCatch, type LakeStats } from './lakeStats';
import { addReplayToProgression, type FightReplay } from './replay';
import { loadLureCatalog } from './rules';
import type {
  CatchRecord,
  DailyChallenge,
  ProgressionState,
  SpotId,
  UnlockThreshold,
  WeeklyTournamentState
} from './types';

const STORAGE_KEY = 'gamegrid.ozark-fishing.progression.v4';

const XP_TABLE = [0, 80, 190, 350, 580, 900, 1300, 1780, 2350, 3050, 3900, 4900, 6000] as const;

const UNLOCKS: UnlockThreshold[] = [
  { level: 1, rodsUnlocked: 1, reelsUnlocked: 1, linesUnlocked: 1, luresUnlocked: 4 },
  { level: 2, rodsUnlocked: 2, reelsUnlocked: 2, linesUnlocked: 1, luresUnlocked: 8 },
  { level: 3, rodsUnlocked: 2, reelsUnlocked: 2, linesUnlocked: 2, luresUnlocked: 11 },
  { level: 4, rodsUnlocked: 3, reelsUnlocked: 3, linesUnlocked: 2, luresUnlocked: 14 },
  { level: 5, rodsUnlocked: 3, reelsUnlocked: 3, linesUnlocked: 3, luresUnlocked: 17 },
  { level: 6, rodsUnlocked: 4, reelsUnlocked: 4, linesUnlocked: 3, luresUnlocked: 20 },
  { level: 7, rodsUnlocked: 4, reelsUnlocked: 4, linesUnlocked: 4, luresUnlocked: 22 },
  { level: 8, rodsUnlocked: 5, reelsUnlocked: 5, linesUnlocked: 4, luresUnlocked: 22 }
];

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

function toDateKey(timestamp = Date.now()): string {
  const date = new Date(timestamp);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function weekKeyFor(timestamp = Date.now()): string {
  const date = new Date(timestamp);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getLevelForXp(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp));
  let level = 1;
  for (let i = 0; i < XP_TABLE.length; i += 1) {
    if (safeXp >= XP_TABLE[i]) level = i + 1;
  }
  return level;
}

export function getUnlocksForLevel(level: number): UnlockThreshold {
  let best = UNLOCKS[0];
  for (let i = 0; i < UNLOCKS.length; i += 1) {
    if (level >= UNLOCKS[i].level) best = UNLOCKS[i];
  }
  return best;
}

export function createDefaultWeeklyTournament(nowMs = Date.now()): WeeklyTournamentState {
  return {
    weekKey: weekKeyFor(nowMs),
    bestDerbyWeightLb: 0,
    bestAt: 0
  };
}

function createDailyChallengeSet(dateKey: string, seed: number): DailyChallenge[] {
  const templates = loadChallengeTemplates();
  const spots = loadSpotCatalog();
  const times: Array<'day' | 'night'> = ['day', 'night'];

  const idxPool = templates.map((_, i) => i);
  const chosen: DailyChallenge[] = [];

  for (let slot = 0; slot < 3; slot += 1) {
    const hash = stableHash(`${dateKey}:${seed}:${slot}`);
    const pickIndex = hash % idxPool.length;
    const template = templates[idxPool[pickIndex]];
    idxPool.splice(pickIndex, 1);

    const tierIdx = hash % template.targets.length;
    const target = template.targets[tierIdx];
    const xpReward = template.xpReward[Math.min(tierIdx, template.xpReward.length - 1)];

    const spotId = spots[hash % spots.length].id;
    const timeOfDay = times[hash % times.length];
    const thresholdWeightLb = Math.max(4, target);

    let description = template.description;
    if (template.kind === 'catch_count_spot') description = `Catch ${target} fish in ${spots.find((s) => s.id === spotId)?.name ?? 'the spot'}.`;
    if (template.kind === 'catch_rare_time') description = `Catch ${target} Rare+ fish at ${timeOfDay}.`;
    if (template.kind === 'land_runner_clean') description = `Land ${target} runner-style fish without snapping.`;
    if (template.kind === 'catch_total_weight') description = `Land ${target} lb total catch weight.`;
    if (template.kind === 'spot_variety') description = `Catch fish in ${target} different spots.`;
    if (template.kind === 'land_trophy_weight') description = `Land ${target} fish at ${thresholdWeightLb.toFixed(0)} lb or heavier.`;

    chosen.push({
      challengeId: template.id,
      name: template.name,
      description,
      kind: template.kind,
      target,
      progress: 0,
      completed: false,
      xpReward,
      metadata: {
        spotId,
        timeOfDay,
        thresholdWeightLb
      }
    });
  }

  return chosen;
}

export function generateDailyChallenges(dateKey: string, seed: number): DailyChallenge[] {
  return createDailyChallengeSet(dateKey, seed).map((challenge) => ({ ...challenge }));
}

function ensureDailySet(state: ProgressionState, nowMs = Date.now()): ProgressionState {
  const dateKey = toDateKey(nowMs);
  if (state.daily.dateKey === dateKey && state.daily.challenges.length === 3) return state;

  const seed = stableHash(dateKey);
  return {
    ...state,
    daily: {
      dateKey,
      seed,
      challenges: createDailyChallengeSet(dateKey, seed)
    }
  };
}

function applyUnlockInventory(state: ProgressionState): ProgressionState {
  const gear = loadGearCatalog();
  const lures = loadLureCatalog();
  const unlocks = getUnlocksForLevel(state.level);

  const rods = gear.rods.slice(0, unlocks.rodsUnlocked).map((item) => item.id);
  const reels = gear.reels.slice(0, unlocks.reelsUnlocked).map((item) => item.id);
  const lines = gear.lines.slice(0, unlocks.linesUnlocked).map((item) => item.id);
  const lureItems = lures.slice(0, unlocks.luresUnlocked).map((item) => item.id);

  return {
    ...state,
    rodsUnlocked: unlocks.rodsUnlocked,
    reelsUnlocked: unlocks.reelsUnlocked,
    linesUnlocked: unlocks.linesUnlocked,
    luresUnlocked: unlocks.luresUnlocked,
    inventory: {
      rods,
      reels,
      lines,
      lures: lureItems
    },
    loadout: {
      rodId: rods.includes(state.loadout.rodId) ? state.loadout.rodId : rods[0],
      reelId: reels.includes(state.loadout.reelId) ? state.loadout.reelId : reels[0],
      lineId: lines.includes(state.loadout.lineId) ? state.loadout.lineId : lines[0],
      lureId: lureItems.includes(state.loadout.lureId) ? state.loadout.lureId : lureItems[0]
    }
  };
}

export function createDefaultProgression(nowMs = Date.now()): ProgressionState {
  const gear = loadGearCatalog();
  const lures = loadLureCatalog();
  const cosmetics = loadCosmeticsCatalog();
  const level = 1;
  const unlocks = getUnlocksForLevel(level);
  const dateKey = toDateKey(nowMs);
  const seed = stableHash(dateKey);

  return {
    xp: 0,
    level,
    rodsUnlocked: unlocks.rodsUnlocked,
    reelsUnlocked: unlocks.reelsUnlocked,
    linesUnlocked: unlocks.linesUnlocked,
    luresUnlocked: unlocks.luresUnlocked,
    catches: [],
    personalBestBySpecies: {},
    lifetimeWeightLb: 0,
    inventory: {
      rods: gear.rods.slice(0, unlocks.rodsUnlocked).map((item) => item.id),
      reels: gear.reels.slice(0, unlocks.reelsUnlocked).map((item) => item.id),
      lines: gear.lines.slice(0, unlocks.linesUnlocked).map((item) => item.id),
      lures: lures.slice(0, unlocks.luresUnlocked).map((item) => item.id)
    },
    loadout: {
      rodId: gear.rods[0].id,
      reelId: gear.reels[0].id,
      lineId: gear.lines[0].id,
      lureId: lures[0].id
    },
    cosmetics: {
      bobberSkinId: cosmetics.bobberSkins[0].id,
      lureSkinByLureId: Object.fromEntries(lures.map((lure) => [lure.id, cosmetics.lureSkins[0].id]))
    },
    trophies: {},
    daily: {
      dateKey,
      seed,
      challenges: createDailyChallengeSet(dateKey, seed)
    },
    weeklyTournament: createDefaultWeeklyTournament(nowMs),
    replays: [],
    highlights: [],
    lakeStats: createDefaultLakeStats(),
    seasons: []
  };
}

export function calculateCatchXp(weightLb: number, difficulty: number, rarityBonus = 1): number {
  const base = weightLb * 11 + difficulty * 18;
  return Math.max(6, Math.round(base * rarityBonus));
}

function updateTrophyProgress(state: ProgressionState, catchRecord: CatchRecord): ProgressionState {
  const prev = state.trophies[catchRecord.fishId];
  const next = {
    fishId: catchRecord.fishId,
    fishName: catchRecord.fishName,
    rarityTier: catchRecord.rarityTier,
    bestWeightLb: Math.max(prev?.bestWeightLb ?? 0, catchRecord.weightLb),
    countCaught: (prev?.countCaught ?? 0) + 1,
    lastCaughtAt: catchRecord.timestamp,
    caughtSpots: Array.from(new Set([...(prev?.caughtSpots ?? []), catchRecord.spotId])),
    caughtTimes: Array.from(new Set([...(prev?.caughtTimes ?? []), catchRecord.timeOfDay])),
    caughtWeather: Array.from(new Set([...(prev?.caughtWeather ?? []), catchRecord.weather]))
  };

  return {
    ...state,
    trophies: {
      ...state.trophies,
      [catchRecord.fishId]: next
    }
  };
}

export function evaluateDailyChallengeProgress(state: ProgressionState, catchRecord: CatchRecord, escapedBySnap = false): ProgressionState {
  const spotsSeen = new Set<SpotId>();
  for (let i = 0; i < state.catches.length; i += 1) {
    spotsSeen.add(state.catches[i].spotId);
  }
  spotsSeen.add(catchRecord.spotId);

  const dailyChallenges = state.daily.challenges.map((challenge) => {
    if (challenge.completed) return challenge;

    let progress = challenge.progress;
    if (challenge.kind === 'catch_count_spot' && challenge.metadata.spotId === catchRecord.spotId) {
      progress += 1;
    }
    if (challenge.kind === 'catch_rare_time' && catchRecord.timeOfDay === challenge.metadata.timeOfDay && (catchRecord.rarityTier === 'Rare' || catchRecord.rarityTier === 'Legendary')) {
      progress += 1;
    }
    if (challenge.kind === 'land_runner_clean' && !escapedBySnap) {
      progress += 1;
    }
    if (challenge.kind === 'catch_total_weight') {
      progress += catchRecord.weightLb;
    }
    if (challenge.kind === 'spot_variety') {
      progress = spotsSeen.size;
    }
    if (challenge.kind === 'land_trophy_weight' && catchRecord.weightLb >= (challenge.metadata.thresholdWeightLb ?? 8)) {
      progress += 1;
    }

    const completed = progress >= challenge.target;
    return {
      ...challenge,
      progress,
      completed
    };
  });

  let xp = state.xp;
  for (let i = 0; i < dailyChallenges.length; i += 1) {
    const prevCompleted = state.daily.challenges[i]?.completed === true;
    if (!prevCompleted && dailyChallenges[i].completed) xp += dailyChallenges[i].xpReward;
  }

  const level = getLevelForXp(xp);
  return applyUnlockInventory({
    ...state,
    xp,
    level,
    daily: {
      ...state.daily,
      challenges: dailyChallenges
    }
  });
}

export function applyCatchProgress(previous: ProgressionState, catchRecord: CatchRecord): ProgressionState {
  const baseState = ensureDailySet(previous, catchRecord.timestamp);
  const xp = baseState.xp + Math.max(0, catchRecord.xp);
  const level = getLevelForXp(xp);

  const catches = [...baseState.catches, catchRecord];
  const maxHistory = 180;
  const boundedCatches = catches.length > maxHistory ? catches.slice(catches.length - maxHistory) : catches;

  const personalBestBySpecies = { ...baseState.personalBestBySpecies };
  const prevBest = personalBestBySpecies[catchRecord.fishId] ?? 0;
  if (catchRecord.weightLb > prevBest) {
    personalBestBySpecies[catchRecord.fishId] = catchRecord.weightLb;
  }

  const withTrophy = updateTrophyProgress(
    {
      ...baseState,
      xp,
      level,
      catches: boundedCatches,
      personalBestBySpecies,
      lifetimeWeightLb: baseState.lifetimeWeightLb + catchRecord.weightLb
    },
    catchRecord
  );

  return evaluateDailyChallengeProgress(applyUnlockInventory(withTrophy), catchRecord);
}

export function applyFightReplay(previous: ProgressionState, replay: FightReplay): ProgressionState {
  return addReplayToProgression(previous, replay);
}

export function applySessionHighlights(previous: ProgressionState, highlights: SessionHighlight[]): ProgressionState {
  return addHighlightsToProgression(previous, highlights);
}

export function applyLakeStatsUpdate(
  previous: ProgressionState,
  catchRecord: CatchRecord,
  fightDurationMs: number,
  highestTension: number,
  derbyFinish?: number
): ProgressionState {
  return {
    ...previous,
    lakeStats: updateLakeStatsFromCatch(previous.lakeStats as LakeStats, catchRecord, fightDurationMs, highestTension, derbyFinish)
  };
}

export function applySeasonSessionRecord(
  previous: ProgressionState,
  input: {
    seasonId: string;
    weekKey: string;
    mode: 'timed_derby' | 'big_catch' | 'ice_fishing' | 'free_fish';
    bestDerbyWeightLb: number;
    bestBigCatchLb: number;
    raresCaught: number;
  }
): ProgressionState {
  const seasons = [...previous.seasons];
  const idx = seasons.findIndex((entry) => entry.seasonId === input.seasonId);
  const base = idx >= 0 ? { ...seasons[idx] } : { seasonId: input.seasonId, weeklyRecords: [], earnedRewards: [] as string[] };

  const weekly = [...base.weeklyRecords];
  const wIdx = weekly.findIndex((entry) => entry.weekKey === input.weekKey);
  if (wIdx >= 0) {
    weekly[wIdx] = {
      weekKey: input.weekKey,
      bestDerbyWeightLb: Math.max(weekly[wIdx].bestDerbyWeightLb, input.bestDerbyWeightLb),
      bestBigCatchLb: Math.max(weekly[wIdx].bestBigCatchLb, input.bestBigCatchLb),
      raresCaught: weekly[wIdx].raresCaught + input.raresCaught
    };
  } else {
    weekly.push({
      weekKey: input.weekKey,
      bestDerbyWeightLb: input.bestDerbyWeightLb,
      bestBigCatchLb: input.bestBigCatchLb,
      raresCaught: input.raresCaught
    });
  }
  if (weekly.length > 26) weekly.splice(0, weekly.length - 26);

  const rewards = new Set(base.earnedRewards);
  const totals = weekly.reduce(
    (acc, rec) => {
      acc.derby = Math.max(acc.derby, rec.bestDerbyWeightLb);
      acc.big = Math.max(acc.big, rec.bestBigCatchLb);
      acc.rare += rec.raresCaught;
      return acc;
    },
    { derby: 0, big: 0, rare: 0 }
  );

  if (totals.derby >= 40) rewards.add('title:Derby Specialist');
  if (totals.big >= 20) rewards.add('frame:Glacier');
  if (totals.rare >= 8) rewards.add('skin:Shimmer Minnow');

  const updated = {
    seasonId: input.seasonId,
    weeklyRecords: weekly,
    earnedRewards: Array.from(rewards).slice(0, 24)
  };

  if (idx >= 0) seasons[idx] = updated;
  else seasons.push(updated);
  if (seasons.length > 8) seasons.splice(0, seasons.length - 8);

  return {
    ...previous,
    seasons
  };
}

export function applyDerbyTournamentResult(previous: ProgressionState, derbyWeightLb: number, nowMs = Date.now()): ProgressionState {
  const nextWeekKey = weekKeyFor(nowMs);
  const weekly = previous.weeklyTournament.weekKey === nextWeekKey ? previous.weeklyTournament : createDefaultWeeklyTournament(nowMs);

  if (derbyWeightLb <= weekly.bestDerbyWeightLb) {
    return {
      ...previous,
      weeklyTournament: weekly
    };
  }

  return {
    ...previous,
    weeklyTournament: {
      weekKey: nextWeekKey,
      bestDerbyWeightLb: derbyWeightLb,
      bestAt: nowMs
    }
  };
}

export function equipLoadoutItem(state: ProgressionState, slot: 'rodId' | 'reelId' | 'lineId' | 'lureId', itemId: string): ProgressionState {
  if (slot === 'rodId' && !state.inventory.rods.includes(itemId)) return state;
  if (slot === 'reelId' && !state.inventory.reels.includes(itemId)) return state;
  if (slot === 'lineId' && !state.inventory.lines.includes(itemId)) return state;
  if (slot === 'lureId' && !state.inventory.lures.includes(itemId)) return state;

  return {
    ...state,
    loadout: {
      ...state.loadout,
      [slot]: itemId
    }
  };
}

export function equipBobberSkin(state: ProgressionState, bobberSkinId: string): ProgressionState {
  return {
    ...state,
    cosmetics: {
      ...state.cosmetics,
      bobberSkinId
    }
  };
}

export function equipLureSkin(state: ProgressionState, lureId: string, lureSkinId: string): ProgressionState {
  return {
    ...state,
    cosmetics: {
      ...state.cosmetics,
      lureSkinByLureId: {
        ...state.cosmetics.lureSkinByLureId,
        [lureId]: lureSkinId
      }
    }
  };
}

export function loadProgression(nowMs = Date.now()): ProgressionState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProgression(nowMs);
    const parsed = JSON.parse(raw) as Partial<ProgressionState>;
    const base = createDefaultProgression(nowMs);

    const xp = typeof parsed.xp === 'number' ? Math.max(0, parsed.xp) : base.xp;
    const level = getLevelForXp(xp);

    let state: ProgressionState = {
      ...base,
      ...parsed,
      xp,
      level,
      catches: Array.isArray(parsed.catches) ? (parsed.catches as CatchRecord[]).slice(-180) : base.catches,
      personalBestBySpecies: parsed.personalBestBySpecies && typeof parsed.personalBestBySpecies === 'object' ? parsed.personalBestBySpecies : {},
      lifetimeWeightLb: typeof parsed.lifetimeWeightLb === 'number' ? Math.max(0, parsed.lifetimeWeightLb) : 0,
      trophies: parsed.trophies && typeof parsed.trophies === 'object' ? parsed.trophies : {},
      replays: Array.isArray(parsed.replays) ? parsed.replays.slice(-50) : [],
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(-120) : [],
      lakeStats: parsed.lakeStats && typeof parsed.lakeStats === 'object' ? parsed.lakeStats : base.lakeStats,
      seasons: Array.isArray(parsed.seasons) ? parsed.seasons.slice(-8) : []
    };

    const parsedCosmetics = parsed.cosmetics;
    if (parsedCosmetics && typeof parsedCosmetics === 'object') {
      state.cosmetics = {
        bobberSkinId: typeof parsedCosmetics.bobberSkinId === 'string' ? parsedCosmetics.bobberSkinId : base.cosmetics.bobberSkinId,
        lureSkinByLureId:
          parsedCosmetics.lureSkinByLureId && typeof parsedCosmetics.lureSkinByLureId === 'object'
            ? parsedCosmetics.lureSkinByLureId
            : base.cosmetics.lureSkinByLureId
      };
    }

    state = applyUnlockInventory(state);
    state = ensureDailySet(state, nowMs);

    if (!state.weeklyTournament || typeof state.weeklyTournament.weekKey !== 'string') {
      state.weeklyTournament = createDefaultWeeklyTournament(nowMs);
    }

    return state;
  } catch {
    return createDefaultProgression(nowMs);
  }
}

export function saveProgression(state: ProgressionState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // no-op
  }
}

export function normalizeSpotSelectionForLevel(level: number, requested: string): SpotId {
  const spots = loadSpotCatalog().filter((spot) => level >= spot.unlockLevel);
  const chosen = spots.find((spot) => spot.id === requested);
  return chosen?.id ?? spots[0]?.id ?? 'cove';
}

export function challengeDateKey(timestamp = Date.now()): string {
  return toDateKey(timestamp);
}

export function challengeSeedForDateKey(dateKey: string): number {
  return stableHash(dateKey);
}

export function clampUnlockCounts(unlocks: UnlockThreshold): UnlockThreshold {
  return {
    level: unlocks.level,
    rodsUnlocked: clamp(unlocks.rodsUnlocked, 1, 99),
    reelsUnlocked: clamp(unlocks.reelsUnlocked, 1, 99),
    linesUnlocked: clamp(unlocks.linesUnlocked, 1, 99),
    luresUnlocked: clamp(unlocks.luresUnlocked, 1, 99)
  };
}
