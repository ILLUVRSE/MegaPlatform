import type { PortalSettings, PortalStats } from '../types';
import { DEBUG_HUD_DEFAULT } from './constants';
import { normalizePortalStats } from './progression';

const SETTINGS_KEY = 'gamegrid.settings.v1';
const STATS_KEY = 'gamegrid.stats.v1';

const defaultSettings: PortalSettings = {
  mute: false,
  musicMuted: false,
  sfxMuted: false,
  reducedMotion: false,
  largeUi: false,
  haptics: false,
  debugHud: DEBUG_HUD_DEFAULT,
  highContrast: false,
  colorblindSafe: false,
  themeMode: 'system',
  themeSkin: 'classic-green-felt',
  perfDiagnostics: false
};

const defaultStats: PortalStats = {
  lastPlayed: null,
  perGame: {},
  totalPlays: 0,
  totalScore: 0,
  totalWins: 0,
  xp: 0,
  level: 1,
  unlockedTitles: [],
  dailyStreak: 0,
  longestStreak: 0,
  lastPlayedOn: null,
  currency: {
    tickets: 300,
    tokens: 0
  },
  dailyQuests: {
    dateKey: '',
    quests: []
  },
  inventory: {
    owned: [],
    equipped: null
  },
  rank: {
    seasonId: '',
    perGame: {},
    meta: {
      rating: 1000,
      tier: 'bronze',
      matches: 0,
      wins: 0,
      losses: 0,
      peakTier: 'bronze'
    }
  },
  battlePass: {
    seasonId: '',
    tier: 0,
    xp: 0,
    premiumUnlocked: false
  },
  dailyReward: {
    dateKey: null,
    streakDay: 0,
    lastClaimedOn: null
  }
};

const getStorage = (): Storage | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const testKey = '__gamegrid_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return null;
  }
};

function readJson<T>(key: string, fallback: T): T {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write errors to preserve runtime stability.
  }
}

export const persistence = {
  loadSettings: (): PortalSettings => readJson(SETTINGS_KEY, defaultSettings),
  saveSettings: (value: PortalSettings): void => writeJson(SETTINGS_KEY, value),
  loadStats: (): PortalStats => normalizePortalStats(readJson(STATS_KEY, defaultStats)),
  saveStats: (value: PortalStats): void => writeJson(STATS_KEY, value)
};
