import type { ActiveRunState, ModuleSlot, SaveBlob } from '../data/starlightTypes';
import { MODULES } from '../data/starlightModules';
import { STARLIGHT_SAVE_KEY } from '../util/starlightConstants';

const SAVE_VERSION = 2;
const ACTIVE_RUN_KEY = 'gamegrid.starlight-chronicles.active-run.v1';

const DEFAULT_EQUIPPED: Record<ModuleSlot, string | null> = {
  primary: 'w-pulse-l1',
  secondary: 'w-micro-missile',
  defenseA: 'd-shield-booster',
  defenseB: 'd-reactive-plate',
  utility: 'u-blink-tuner',
  rig: 'r-radiator'
};

export function createDefaultSave(): SaveBlob {
  return {
    version: SAVE_VERSION,
    credits: 150,
    materials: 0,
    inventory: MODULES.filter((mod) => !mod.signatureTech).slice(0, 12).map((mod) => mod.id),
    equippedSlots: { ...DEFAULT_EQUIPPED },
    unlocks: {
      signatureTech: []
    },
    bossKills: [],
    settings: {
      mute: false,
      reducedEffects: false
    },
    activeRun: null
  };
}

function parseActiveRun(raw: unknown): ActiveRunState | null {
  if (!raw || typeof raw !== 'object') return null;
  const run = raw as Partial<ActiveRunState>;
  if (typeof run.missionId !== 'string') return null;
  return {
    missionId: run.missionId,
    selectedPerkId: typeof run.selectedPerkId === 'string' ? run.selectedPerkId : null,
    seed: typeof run.seed === 'number' ? run.seed : Date.now(),
    earnedCredits: typeof run.earnedCredits === 'number' ? run.earnedCredits : 0,
    earnedLoot: Array.isArray(run.earnedLoot) ? run.earnedLoot.filter((entry): entry is string => typeof entry === 'string') : [],
    defeated: Boolean(run.defeated)
  };
}

function migrateSave(raw: unknown): SaveBlob {
  const base = createDefaultSave();
  if (!raw || typeof raw !== 'object') return base;
  const candidate = raw as Record<string, unknown>;

  const credits = typeof candidate.credits === 'number' ? candidate.credits : typeof candidate.currency === 'number' ? candidate.currency : base.credits;
  const inventory = Array.isArray(candidate.inventory)
    ? candidate.inventory.filter((entry): entry is string => typeof entry === 'string')
    : Array.isArray(candidate.inventoryModules)
      ? (candidate.inventoryModules as unknown[]).filter((entry): entry is string => typeof entry === 'string')
      : base.inventory;

  const equippedRaw = (candidate.equippedSlots ?? candidate.equippedModules) as Partial<Record<ModuleSlot, string | null>> | undefined;
  const unlockRaw = (candidate.unlocks as { signatureTech?: unknown } | undefined) ?? null;
  const signatureTech = unlockRaw && Array.isArray(unlockRaw.signatureTech)
    ? unlockRaw.signatureTech.filter((entry): entry is string => typeof entry === 'string')
    : Array.isArray(candidate.unlockedSignatureTech)
      ? (candidate.unlockedSignatureTech as unknown[]).filter((entry): entry is string => typeof entry === 'string')
      : base.unlocks.signatureTech;

  const bossKills = Array.isArray(candidate.bossKills)
    ? candidate.bossKills.filter((entry): entry is string => typeof entry === 'string')
    : Array.isArray(candidate.bossUnlocks)
      ? (candidate.bossUnlocks as unknown[]).filter((entry): entry is string => typeof entry === 'string')
      : base.bossKills;

  const settingsRaw = candidate.settings as { mute?: unknown; reducedEffects?: unknown } | undefined;
  const activeRun = parseActiveRun(candidate.activeRun);

  return {
    version: SAVE_VERSION,
    credits,
    materials: typeof candidate.materials === 'number' ? candidate.materials : base.materials,
    inventory,
    equippedSlots: {
      primary: equippedRaw?.primary ?? base.equippedSlots.primary,
      secondary: equippedRaw?.secondary ?? base.equippedSlots.secondary,
      defenseA: equippedRaw?.defenseA ?? base.equippedSlots.defenseA,
      defenseB: equippedRaw?.defenseB ?? base.equippedSlots.defenseB,
      utility: equippedRaw?.utility ?? base.equippedSlots.utility,
      rig: equippedRaw?.rig ?? base.equippedSlots.rig
    },
    unlocks: {
      signatureTech
    },
    bossKills,
    settings: {
      mute: typeof settingsRaw?.mute === 'boolean' ? settingsRaw.mute : base.settings.mute,
      reducedEffects: typeof settingsRaw?.reducedEffects === 'boolean' ? settingsRaw.reducedEffects : base.settings.reducedEffects
    },
    activeRun
  };
}

export function loadSave(): SaveBlob {
  try {
    const raw = window.localStorage.getItem(STARLIGHT_SAVE_KEY);
    if (!raw) {
      const save = createDefaultSave();
      persistSave(save);
      return save;
    }
    const parsed = JSON.parse(raw) as unknown;
    const migrated = migrateSave(parsed);
    const runRaw = window.localStorage.getItem(ACTIVE_RUN_KEY);
    if (runRaw) {
      migrated.activeRun = parseActiveRun(JSON.parse(runRaw));
    }
    persistSave(migrated);
    return migrated;
  } catch {
    const fallback = createDefaultSave();
    persistSave(fallback);
    return fallback;
  }
}

export function persistSave(save: SaveBlob): void {
  window.localStorage.setItem(STARLIGHT_SAVE_KEY, JSON.stringify(save));
  if (save.activeRun) {
    window.localStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(save.activeRun));
  } else {
    window.localStorage.removeItem(ACTIVE_RUN_KEY);
  }
}
