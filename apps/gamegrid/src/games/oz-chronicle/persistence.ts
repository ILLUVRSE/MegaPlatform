import {
  createInitialState,
  type BossMiniGameId,
  type CompanionId,
  type CompanionProgress,
  type GoldenCapCommand,
  type GoldenCapState,
  type OzChronicleState,
  type PackId
} from './rules';

const SAVE_KEY = 'gamegrid.oz-chronicle.save.v2';
const LEGACY_SAVE_KEY = 'gamegrid.oz-chronicle.save.v1';

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeCompanions(input: unknown): CompanionProgress {
  const base = createInitialState(1).companions;
  if (!input || typeof input !== 'object') return base;
  const record = input as Record<string, unknown>;

  const ids: CompanionId[] = ['scarecrow', 'tin-woodman', 'cowardly-lion'];
  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    const raw = record[id] as Record<string, unknown> | undefined;
    if (!raw || typeof raw !== 'object') continue;
    base[id] = {
      acquired: !!raw.acquired,
      meter: typeof raw.meter === 'number' ? Math.max(0, Math.min(9, Math.round(raw.meter))) : 0,
      recentActions: Array.isArray(raw.recentActions)
        ? raw.recentActions.filter((entry): entry is string => typeof entry === 'string').slice(-4)
        : []
    };
  }

  return base;
}

function normalizePacks(input: unknown): PackId[] {
  if (!Array.isArray(input)) return [];
  const ids = input.filter(
    (entry): entry is PackId =>
      entry === 'pack1' ||
      entry === 'pack2' ||
      entry === 'pack3' ||
      entry === 'pack4' ||
      entry === 'pack5' ||
      entry === 'pack6' ||
      entry === 'pack7' ||
      entry === 'pack8' ||
      entry === 'pack9'
  );
  return [...new Set(ids)];
}

function normalizeBossRecord(input: unknown): Partial<Record<BossMiniGameId, number>> {
  if (!input || typeof input !== 'object') return {};
  const record = input as Record<string, unknown>;
  const out: Partial<Record<BossMiniGameId, number>> = {};
  const ids: BossMiniGameId[] = ['kalidah-chase', 'poppy-drift-rescue', 'shadow-of-the-west', 'western-hold-escape', 'dousing-the-shadow'];
  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    const raw = record[id];
    if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
      out[id] = Math.round(raw);
    }
  }
  return out;
}

function normalizeGoldenCap(input: unknown): GoldenCapState {
  const base = createInitialState(1).goldenCap;
  if (!input || typeof input !== 'object') return base;
  const record = input as Record<string, unknown>;
  const history = Array.isArray(record.commandHistory)
    ? record.commandHistory
        .filter(
          (entry): entry is GoldenCapCommand => entry === 'aid-rescue' || entry === 'carry-companions' || entry === 'clear-path'
        )
        .slice(-6)
    : [];
  const usesRaw = typeof record.usesRemaining === 'number' ? Math.round(record.usesRemaining) : base.usesRemaining;
  return {
    acquired: !!record.acquired,
    usesRemaining: Math.max(0, Math.min(3, usesRaw)),
    commandHistory: history
  };
}

function migrateLegacy(raw: unknown, seed: number): OzChronicleState {
  const base = createInitialState(seed);
  if (!raw || typeof raw !== 'object') return base;
  const legacy = raw as Record<string, unknown>;

  return {
    ...base,
    run: {
      seed: (legacy.run as { seed?: number } | undefined)?.seed ?? seed,
      mapNodeId: (legacy.run as { mapNodeId?: string } | undefined)?.mapNodeId ?? base.run.mapNodeId,
      chapterId: (legacy.run as { chapterId?: string } | undefined)?.chapterId ?? base.run.chapterId,
      chapterNodeId: (legacy.run as { chapterNodeId?: string } | undefined)?.chapterNodeId ?? base.run.chapterNodeId,
      completedNodeIds: Array.isArray((legacy.run as { completedNodeIds?: unknown[] } | undefined)?.completedNodeIds)
        ? ((legacy.run as { completedNodeIds?: unknown[] }).completedNodeIds ?? []).filter(
            (entry): entry is string => typeof entry === 'string'
          )
        : []
    },
    stats: {
      courage: typeof (legacy.stats as { courage?: number } | undefined)?.courage === 'number' ? (legacy.stats as { courage: number }).courage : base.stats.courage,
      brains: typeof (legacy.stats as { brains?: number } | undefined)?.brains === 'number' ? (legacy.stats as { brains: number }).brains : base.stats.brains,
      heart: typeof (legacy.stats as { heart?: number } | undefined)?.heart === 'number' ? (legacy.stats as { heart: number }).heart : base.stats.heart
    },
    inventory: {
      silverSlippers: !!(legacy.inventory as { silverSlippers?: boolean } | undefined)?.silverSlippers,
      protectionMark: !!(legacy.inventory as { protectionMark?: boolean } | undefined)?.protectionMark
    },
    bestMiniGameScores:
      legacy.bestMiniGameScores && typeof legacy.bestMiniGameScores === 'object'
        ? (legacy.bestMiniGameScores as Record<string, number>)
        : {},
    unlockedGlossary: Array.isArray(legacy.unlockedGlossary)
      ? legacy.unlockedGlossary.filter((entry): entry is string => typeof entry === 'string')
      : base.unlockedGlossary,
    unlockedSketches: Array.isArray(legacy.unlockedSketches)
      ? legacy.unlockedSketches.filter((entry): entry is string => typeof entry === 'string')
      : [],
    companions: normalizeCompanions(legacy.companions),
    settings: {
      reducedMotion: !!(legacy.settings as { reducedMotion?: boolean } | undefined)?.reducedMotion,
      spectaclesTint:
        (legacy.settings as { spectaclesTint?: boolean } | undefined)?.spectaclesTint === undefined
          ? true
          : !!(legacy.settings as { spectaclesTint?: boolean } | undefined)?.spectaclesTint
    }
  };
}

export function loadState(seed: number): OzChronicleState {
  const storage = getStorage();
  if (!storage) return createInitialState(seed);

  try {
    const raw = storage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as OzChronicleState;
      if (parsed && parsed.version === 2) {
        return {
          ...createInitialState(seed),
          ...parsed,
          goldenCap: normalizeGoldenCap(parsed.goldenCap),
          companions: normalizeCompanions(parsed.companions),
          completedPackIds: normalizePacks(parsed.completedPackIds),
          bestBossScores: normalizeBossRecord(parsed.bestBossScores),
          bestBossTimesMs: normalizeBossRecord(parsed.bestBossTimesMs),
          storyFlags: {
            ...createInitialState(seed).storyFlags,
            ...(parsed.storyFlags ?? {})
          },
          settings: {
            ...createInitialState(seed).settings,
            ...(parsed.settings ?? {})
          }
        };
      }
    }
  } catch {
    // ignore parse failures
  }

  try {
    const legacyRaw = storage.getItem(LEGACY_SAVE_KEY);
    if (legacyRaw) {
      return migrateLegacy(JSON.parse(legacyRaw), seed);
    }
  } catch {
    // ignore parse failures
  }

  return createInitialState(seed);
}

export function saveState(state: OzChronicleState): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage write failures
  }
}
