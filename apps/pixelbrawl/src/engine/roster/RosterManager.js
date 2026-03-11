import rosterData from "./roster.json";

const DEFAULT_RENDER = {
  origin: { x: 0.5, y: 1 },
  baseScale: 1,
  offset: { x: 0, y: 0 },
  lane: {
    back: { scaleMul: 0.9, brightMul: 0.88, shadowMul: 0.85 },
    mid: { scaleMul: 1, brightMul: 1, shadowMul: 1 },
    front: { scaleMul: 1.12, brightMul: 1.1, shadowMul: 1.1 }
  }
};

const DEFAULT_ACCENT = {
  primary: "#8ffcff",
  secondary: "#ffe47a"
};

const DEFAULT_STATS = {
  walkSpeedMul: 1,
  damageMul: 1,
  hpMul: 1,
  throwMul: 1,
  recoveryMul: 1
};

export class RosterManager {
  static getAllSlots() {
    return rosterData.slots.map((id) => ({
      id,
      meta: this.getFighterMeta(id),
      locked: this.isLocked(id)
    }));
  }

  static getFighterMeta(id) {
    const key = String(id || "").toLowerCase();
    const entry = rosterData.fighters[key] || {};
    return {
      id: key,
      displayName: entry.displayName || key.toUpperCase(),
      tag: entry.tag || "Unknown",
      accent: {
        primary: entry.accent?.primary || DEFAULT_ACCENT.primary,
        secondary: entry.accent?.secondary || DEFAULT_ACCENT.secondary
      },
      portrait: entry.portrait || null,
      assets: entry.assets || null,
      render: {
        origin: entry.render?.origin || DEFAULT_RENDER.origin,
        baseScale: entry.render?.baseScale ?? DEFAULT_RENDER.baseScale,
        offset: entry.render?.offset || DEFAULT_RENDER.offset,
        lane: {
          back: { ...DEFAULT_RENDER.lane.back, ...(entry.render?.lane?.back || {}) },
          mid: { ...DEFAULT_RENDER.lane.mid, ...(entry.render?.lane?.mid || {}) },
          front: { ...DEFAULT_RENDER.lane.front, ...(entry.render?.lane?.front || {}) }
        }
      },
      stats: {
        walkSpeedMul: entry.stats?.walkSpeedMul ?? DEFAULT_STATS.walkSpeedMul,
        damageMul: entry.stats?.damageMul ?? DEFAULT_STATS.damageMul,
        hpMul: entry.stats?.hpMul ?? DEFAULT_STATS.hpMul,
        throwMul: entry.stats?.throwMul ?? DEFAULT_STATS.throwMul,
        recoveryMul: entry.stats?.recoveryMul ?? DEFAULT_STATS.recoveryMul
      },
      enabled: entry.enabled === true
    };
  }

  static isLocked(id) {
    const key = String(id || "").toLowerCase();
    return rosterData.locked.includes(key);
  }

  static getEnabledFighters() {
    return rosterData.slots.filter((id) => this.getFighterMeta(id).enabled);
  }
}
