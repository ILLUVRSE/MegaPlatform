import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loadSaveManager = async () => {
  vi.resetModules();
  const mod = await import("../src/state/SaveManager.js");
  return mod.SaveManager;
};

describe("SaveManager migration and unlocks", () => {
  beforeEach(() => {
    const store = new Map();
    vi.stubGlobal("localStorage", {
      clear: () => store.clear(),
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key)
    });
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("migrates old saves to version 1 defaults", async () => {
    const SaveManager = await loadSaveManager();
    const old = {
      version: 0,
      settings: { music: 0.12 },
      progression: { totalWins: 4 }
    };

    const migrated = SaveManager.applyMigration(old);
    expect(migrated.version).toBe(1);
    expect(migrated.settings.music).toBe(0.12);
    expect(migrated.progression.totalWins).toBe(4);
    expect(migrated.progression.unlockProgress).toBeTypeOf("object");
  });

  it("imports legacy audio settings when no main save exists", async () => {
    localStorage.setItem(
      "pixelbrawl_audio",
      JSON.stringify({ music: 0.3, sfx: 0.4, mute: true, shake: "off", controlsOpacity: 0.6 })
    );

    const SaveManager = await loadSaveManager();
    const save = SaveManager.load();

    expect(save.settings.music).toBe(0.3);
    expect(save.settings.sfx).toBe(0.4);
    expect(save.settings.mute).toBe(true);
    expect(save.settings.shake).toBe("off");
    expect(save.settings.controlsOpacity).toBe(0.6);
  });

  it("unlocks next fighter in configured order", async () => {
    const SaveManager = await loadSaveManager();
    const save = SaveManager.load();

    expect(save.progression.unlockedFighters.echo).toBeUndefined();
    const next = SaveManager.unlockNext();

    expect(next).toBe("echo");
    const updated = SaveManager.load();
    expect(updated.progression.unlockedFighters.echo).toBe(true);
  });
});
