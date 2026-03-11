import rosterData from "../engine/roster/roster.json";
import { UnlockRules } from "./UnlockRules.js";

const SAVE_KEY = "pixelbrawl_save_v1";
const LEGACY_AUDIO_KEY = "pixelbrawl_audio";

let currentSave = null;

const buildUnlockProgress = () => {
  const progress = {};
  Object.keys(rosterData.fighters).forEach((id) => {
    progress[id] = { wins: 0, arcadeClears: 0 };
  });
  return progress;
};

const defaultSave = () => {
  const unlockedFighters = {};
  UnlockRules.defaultUnlocked.forEach((id) => {
    unlockedFighters[id] = true;
  });

  return {
    version: 1,
    createdAt: Date.now(),
    settings: {
      music: 0.7,
      sfx: 0.7,
      mute: false,
      shake: "full",
      controlsOpacity: 0.9,
      storyEnabled: true,
      storyTextMode: "instant",
      storyAutoAdvance: false
    },
    progression: {
      unlockedFighters,
      unlockProgress: buildUnlockProgress(),
      totalWins: 0,
      arcadeClears: 0,
      bestArcadeGrade: null,
      bestArcadeTimeMs: null
    },
    stats: {
      matchesPlayed: 0,
      damageDealt: 0,
      damageTaken: 0,
      perfectBlocks: 0,
      kos: 0
    }
  };
};

const mergeDefaults = (base, override) => {
  if (!override) return base;
  return {
    ...base,
    ...override,
    settings: { ...base.settings, ...(override.settings || {}) },
    progression: {
      ...base.progression,
      ...(override.progression || {}),
      unlockedFighters: {
        ...base.progression.unlockedFighters,
        ...(override.progression?.unlockedFighters || {})
      },
      unlockProgress: {
        ...base.progression.unlockProgress,
        ...(override.progression?.unlockProgress || {})
      }
    },
    stats: { ...base.stats, ...(override.stats || {}) }
  };
};

const migrateLegacySettings = (save) => {
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_AUDIO_KEY) || "{}");
    if (legacy && typeof legacy === "object") {
      save.settings = {
        ...save.settings,
        ...(typeof legacy.music === "number" ? { music: legacy.music } : {}),
        ...(typeof legacy.sfx === "number" ? { sfx: legacy.sfx } : {}),
        ...(typeof legacy.mute === "boolean" ? { mute: legacy.mute } : {}),
        ...(typeof legacy.shake === "string" ? { shake: legacy.shake } : {}),
        ...(typeof legacy.controlsOpacity === "number" ? { controlsOpacity: legacy.controlsOpacity } : {})
      };
    }
  } catch {
    // ignore
  }
};

export class SaveManager {
  static load() {
    if (currentSave) return currentSave;
    const base = defaultSave();
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const migrated = this.applyMigration(parsed);
        currentSave = mergeDefaults(base, migrated);
      } else {
        currentSave = base;
        migrateLegacySettings(currentSave);
      }
    } catch {
      currentSave = base;
    }
    this.persist();
    return currentSave;
  }

  static applyMigration(oldSave) {
    if (!oldSave || typeof oldSave !== "object") return null;
    if (!oldSave.version || oldSave.version < 1) {
      return {
        ...mergeDefaults(defaultSave(), oldSave),
        version: 1
      };
    }
    return oldSave;
  }

  static persist() {
    if (!currentSave) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify(currentSave));
  }

  static get() {
    return this.load();
  }

  static save(patch) {
    const base = this.load();
    currentSave = mergeDefaults(base, patch);
    this.persist();
    return currentSave;
  }

  static update(fn) {
    const base = this.load();
    const next = fn(base) || base;
    currentSave = mergeDefaults(base, next);
    this.persist();
    return currentSave;
  }

  static reset() {
    currentSave = defaultSave();
    this.persist();
    return currentSave;
  }

  static isUnlocked(id) {
    const save = this.load();
    return save.progression.unlockedFighters[String(id).toLowerCase()] === true;
  }

  static unlock(id) {
    const key = String(id).toLowerCase();
    return this.update((save) => ({
      ...save,
      progression: {
        ...save.progression,
        unlockedFighters: {
          ...save.progression.unlockedFighters,
          [key]: true
        }
      }
    }));
  }

  static unlockNext() {
    const save = this.load();
    const next = UnlockRules.getNextUnlock(save.progression.unlockedFighters);
    if (!next) return null;
    this.unlock(next);
    return next;
  }
}
