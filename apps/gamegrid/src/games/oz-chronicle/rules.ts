export interface OzChronicleStats {
  courage: number;
  brains: number;
  heart: number;
}

export interface OzChronicleInventory {
  silverSlippers: boolean;
  protectionMark: boolean;
}

export interface OzChronicleSettings {
  reducedMotion: boolean;
  spectaclesTint: boolean;
}

export type CompanionId = 'scarecrow' | 'tin-woodman' | 'cowardly-lion';
export type PackId = 'pack1' | 'pack2' | 'pack3' | 'pack4' | 'pack5' | 'pack6' | 'pack7' | 'pack8' | 'pack9';
export type BossMiniGameId =
  | 'kalidah-chase'
  | 'poppy-drift-rescue'
  | 'shadow-of-the-west'
  | 'western-hold-escape'
  | 'dousing-the-shadow';
export type GoldenCapCommand = 'aid-rescue' | 'carry-companions' | 'clear-path';

export interface GoldenCapState {
  acquired: boolean;
  usesRemaining: number;
  commandHistory: GoldenCapCommand[];
}

export interface CompanionState {
  acquired: boolean;
  meter: number;
  recentActions: string[];
}

export type CompanionProgress = Record<CompanionId, CompanionState>;

export interface OzChronicleStoryFlags {
  dorothyAsleep: boolean;
  lionAsleep: boolean;
  fieldMiceRescueComplete: boolean;
  spectaclesOn: boolean;
  westwardJourneyUnlocked: boolean;
  pack6RouteToken: boolean;
  winkieCountryReached: boolean;
  westThreatLevel: number;
  witchDefeatedWest: boolean;
  winkieFreed: boolean;
  returnQuestUnlocked: boolean;
  wizardRevealed: boolean;
  scarecrowGifted: boolean;
  tinGifted: boolean;
  lionGifted: boolean;
  balloonAttempted: boolean;
  dorothyStillInOz: boolean;
}

export interface OzChronicleRunProgress {
  seed: number;
  mapNodeId: string;
  chapterId: string;
  chapterNodeId: string;
  completedNodeIds: string[];
}

export interface OzChronicleState {
  version: 2;
  stats: OzChronicleStats;
  inventory: OzChronicleInventory;
  goldenCap: GoldenCapState;
  companions: CompanionProgress;
  run: OzChronicleRunProgress;
  storyFlags: OzChronicleStoryFlags;
  completedPackIds: PackId[];
  bestMiniGameScores: Record<string, number>;
  bestBossScores: Partial<Record<BossMiniGameId, number>>;
  bestBossTimesMs: Partial<Record<BossMiniGameId, number>>;
  unlockedGlossary: string[];
  unlockedSketches: string[];
  settings: OzChronicleSettings;
}

export interface StoryOutcome {
  courage?: number;
  brains?: number;
  heart?: number;
  silverSlippers?: boolean;
  protectionMark?: boolean;
  companionAcquire?: CompanionId[];
  companionMeter?: Partial<Record<CompanionId, number>>;
  companionAction?: Partial<Record<CompanionId, string>>;
  unlockGlossary?: string[];
  unlockSketches?: string[];
  status?: Partial<OzChronicleStoryFlags>;
  goldenCapAcquire?: boolean;
  goldenCapCommand?: GoldenCapCommand;
  goldenCapUsesDelta?: number;
}

const STAT_CLAMP_MIN = 0;
const STAT_CLAMP_MAX = 9;
const COMPANION_METER_CLAMP_MIN = 0;
const COMPANION_METER_CLAMP_MAX = 9;
const GOLDEN_CAP_MIN_USES = 0;
const GOLDEN_CAP_MAX_USES = 3;

function clampStat(value: number): number {
  return Math.max(STAT_CLAMP_MIN, Math.min(STAT_CLAMP_MAX, value));
}

function clampCompanionMeter(value: number): number {
  return Math.max(COMPANION_METER_CLAMP_MIN, Math.min(COMPANION_METER_CLAMP_MAX, value));
}

function clampGoldenCapUses(value: number): number {
  return Math.max(GOLDEN_CAP_MIN_USES, Math.min(GOLDEN_CAP_MAX_USES, Math.round(value)));
}

function createInitialCompanions(): CompanionProgress {
  return {
    scarecrow: {
      acquired: false,
      meter: 0,
      recentActions: []
    },
    'tin-woodman': {
      acquired: false,
      meter: 0,
      recentActions: []
    },
    'cowardly-lion': {
      acquired: false,
      meter: 0,
      recentActions: []
    }
  };
}

function pushAction(actions: string[], line: string | undefined): string[] {
  if (!line) return actions;
  const merged = [...actions, line];
  return merged.slice(Math.max(0, merged.length - 4));
}

export function createInitialState(seed: number): OzChronicleState {
  return {
    version: 2,
    stats: {
      courage: 1,
      brains: 1,
      heart: 1
    },
    inventory: {
      silverSlippers: false,
      protectionMark: false
    },
    goldenCap: {
      acquired: false,
      usesRemaining: 0,
      commandHistory: []
    },
    companions: createInitialCompanions(),
    run: {
      seed,
      mapNodeId: 'arrival-cyclone',
      chapterId: 'arrival-munchkins',
      chapterNodeId: 'arrival_1',
      completedNodeIds: []
    },
    storyFlags: {
      dorothyAsleep: false,
      lionAsleep: false,
      fieldMiceRescueComplete: false,
      spectaclesOn: false,
      westwardJourneyUnlocked: false,
      pack6RouteToken: false,
      winkieCountryReached: false,
      westThreatLevel: 0,
      witchDefeatedWest: false,
      winkieFreed: false,
      returnQuestUnlocked: false,
      wizardRevealed: false,
      scarecrowGifted: false,
      tinGifted: false,
      lionGifted: false,
      balloonAttempted: false,
      dorothyStillInOz: true
    },
    completedPackIds: [],
    bestMiniGameScores: {},
    bestBossScores: {},
    bestBossTimesMs: {},
    unlockedGlossary: ['dorothy-gale', 'toto'],
    unlockedSketches: [],
    settings: {
      reducedMotion: false,
      spectaclesTint: true
    }
  };
}

export function unlockSketches(state: OzChronicleState, sketchIds: readonly string[]): OzChronicleState {
  if (sketchIds.length === 0) return state;
  const merged = new Set(state.unlockedSketches);
  for (let i = 0; i < sketchIds.length; i += 1) {
    merged.add(sketchIds[i]);
  }
  return {
    ...state,
    unlockedSketches: [...merged]
  };
}

export function addCompanionMeter(
  state: OzChronicleState,
  companionId: CompanionId,
  amount: number,
  actionLine?: string
): OzChronicleState {
  const prior = state.companions[companionId];
  const nextCompanion: CompanionState = {
    acquired: prior.acquired,
    meter: clampCompanionMeter(prior.meter + amount),
    recentActions: pushAction(prior.recentActions, actionLine)
  };

  return {
    ...state,
    companions: {
      ...state.companions,
      [companionId]: nextCompanion
    }
  };
}

export function acquireCompanion(state: OzChronicleState, companionId: CompanionId, actionLine?: string): OzChronicleState {
  const prior = state.companions[companionId];
  if (prior.acquired && !actionLine) return state;

  return {
    ...state,
    companions: {
      ...state.companions,
      [companionId]: {
        ...prior,
        acquired: true,
        recentActions: pushAction(prior.recentActions, actionLine)
      }
    }
  };
}

export function applyStoryOutcome(state: OzChronicleState, outcome: StoryOutcome): OzChronicleState {
  const unlockedGlossary = new Set(state.unlockedGlossary);
  for (const key of outcome.unlockGlossary ?? []) {
    unlockedGlossary.add(key);
  }

  let nextState: OzChronicleState = {
    ...state,
    stats: {
      courage: clampStat(state.stats.courage + (outcome.courage ?? 0)),
      brains: clampStat(state.stats.brains + (outcome.brains ?? 0)),
      heart: clampStat(state.stats.heart + (outcome.heart ?? 0))
    },
    storyFlags: {
      ...state.storyFlags,
      ...outcome.status
    },
    inventory: {
      silverSlippers: outcome.silverSlippers ?? state.inventory.silverSlippers,
      protectionMark: outcome.protectionMark ?? state.inventory.protectionMark
    },
    unlockedGlossary: [...unlockedGlossary]
  };

  if (outcome.goldenCapAcquire) {
    nextState = {
      ...nextState,
      goldenCap: {
        acquired: true,
        usesRemaining: Math.max(nextState.goldenCap.usesRemaining, GOLDEN_CAP_MAX_USES),
        commandHistory: nextState.goldenCap.commandHistory
      }
    };
  }

  if (typeof outcome.goldenCapUsesDelta === 'number' && Number.isFinite(outcome.goldenCapUsesDelta)) {
    nextState = {
      ...nextState,
      goldenCap: {
        ...nextState.goldenCap,
        usesRemaining: clampGoldenCapUses(nextState.goldenCap.usesRemaining + outcome.goldenCapUsesDelta)
      }
    };
  }

  for (const companionId of outcome.companionAcquire ?? []) {
    nextState = acquireCompanion(nextState, companionId, outcome.companionAction?.[companionId]);
  }

  const meterChanges = outcome.companionMeter ?? {};
  const companionKeys = Object.keys(meterChanges) as CompanionId[];
  for (let i = 0; i < companionKeys.length; i += 1) {
    const companionId = companionKeys[i];
    const delta = meterChanges[companionId] ?? 0;
    if (delta === 0) continue;
    nextState = addCompanionMeter(nextState, companionId, delta, outcome.companionAction?.[companionId]);
  }

  if (outcome.unlockSketches && outcome.unlockSketches.length > 0) {
    nextState = unlockSketches(nextState, outcome.unlockSketches);
  }

  if (outcome.goldenCapCommand) {
    nextState = useGoldenCapCommand(nextState, outcome.goldenCapCommand);
  }

  return nextState;
}

export function canUseGoldenCap(state: OzChronicleState): boolean {
  return state.goldenCap.acquired && state.goldenCap.usesRemaining > 0;
}

export function useGoldenCapCommand(state: OzChronicleState, command: GoldenCapCommand): OzChronicleState {
  if (!canUseGoldenCap(state)) return state;
  return {
    ...state,
    goldenCap: {
      acquired: true,
      usesRemaining: clampGoldenCapUses(state.goldenCap.usesRemaining - 1),
      commandHistory: [...state.goldenCap.commandHistory, command].slice(-6)
    }
  };
}

export function markMiniGameScore(state: OzChronicleState, miniGameId: string, score: number): OzChronicleState {
  const prior = state.bestMiniGameScores[miniGameId] ?? 0;
  if (score <= prior) return state;
  return {
    ...state,
    bestMiniGameScores: {
      ...state.bestMiniGameScores,
      [miniGameId]: score
    }
  };
}

export function markBossResult(
  state: OzChronicleState,
  bossId: BossMiniGameId,
  score: number,
  elapsedMs: number
): OzChronicleState {
  const priorScore = state.bestBossScores[bossId] ?? 0;
  const priorTime = state.bestBossTimesMs[bossId] ?? Number.POSITIVE_INFINITY;
  const nextTime = elapsedMs > 0 ? Math.min(priorTime, elapsedMs) : priorTime;

  return {
    ...state,
    bestBossScores: {
      ...state.bestBossScores,
      [bossId]: Math.max(priorScore, score)
    },
    bestBossTimesMs: {
      ...state.bestBossTimesMs,
      [bossId]: Number.isFinite(nextTime) ? nextTime : elapsedMs
    }
  };
}

export function markPackCompleted(state: OzChronicleState, packId: PackId): OzChronicleState {
  if (state.completedPackIds.includes(packId)) return state;
  return {
    ...state,
    completedPackIds: [...state.completedPackIds, packId]
  };
}

export function setChapterPosition(
  state: OzChronicleState,
  chapterId: string,
  chapterNodeId: string,
  mapNodeId: string
): OzChronicleState {
  return {
    ...state,
    run: {
      ...state.run,
      chapterId,
      chapterNodeId,
      mapNodeId
    }
  };
}

export function completeMapNode(state: OzChronicleState, mapNodeId: string, nextNodeId: string): OzChronicleState {
  const completed = state.run.completedNodeIds.includes(mapNodeId)
    ? state.run.completedNodeIds
    : [...state.run.completedNodeIds, mapNodeId];

  return {
    ...state,
    run: {
      ...state.run,
      mapNodeId: nextNodeId,
      completedNodeIds: completed
    }
  };
}

export function setReducedMotion(state: OzChronicleState, value: boolean): OzChronicleState {
  return {
    ...state,
    settings: {
      ...state.settings,
      reducedMotion: value
    }
  };
}

export function setSpectaclesTint(state: OzChronicleState, value: boolean): OzChronicleState {
  return {
    ...state,
    settings: {
      ...state.settings,
      spectaclesTint: value
    }
  };
}
