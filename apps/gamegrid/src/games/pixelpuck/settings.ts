import type { PixelPuckDifficulty, PixelPuckMode, PixelPuckSensitivity } from './types';

export type EffectsLevel = 'off' | 'low' | 'high';
export type OneHandedSide = 'left' | 'right';

export interface PixelPuckSettings {
  mode: PixelPuckMode;
  difficulty: PixelPuckDifficulty;
  rinkId: string;
  sensitivity: PixelPuckSensitivity;
  assist: boolean;
  powerSmash: boolean;
  soundOn: boolean;
  haptics: boolean;
  effects: EffectsLevel;
  dprCap: number;
  autoQuality: boolean;
  screenShake: boolean;
  trail: boolean;
  spin: boolean;
  smoothing: number;
  sticky: number;
  oneHanded: boolean;
  oneHandedSide: OneHandedSide;
  tutorialSeen: boolean;
}

const SETTINGS_KEY = 'gamegrid.pixelpuck.settings.v2';

const DEFAULT_SETTINGS: PixelPuckSettings = {
  mode: 'first_to_7',
  difficulty: 'medium',
  rinkId: 'classic',
  sensitivity: 'medium',
  assist: true,
  powerSmash: true,
  soundOn: true,
  haptics: true,
  effects: 'high',
  dprCap: 1.75,
  autoQuality: true,
  screenShake: true,
  trail: true,
  spin: true,
  smoothing: 0.22,
  sticky: 0.35,
  oneHanded: false,
  oneHandedSide: 'right',
  tutorialSeen: false
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getDefaultDprCap() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.dprCap;
  const device = window.devicePixelRatio || 1;
  return clamp(Math.min(device, 2), 1, 2);
}

export function loadPixelPuckSettings(): PixelPuckSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, dprCap: getDefaultDprCap() };
    const parsed = JSON.parse(raw) as Partial<PixelPuckSettings>;
    return {
      ...DEFAULT_SETTINGS,
      dprCap: getDefaultDprCap(),
      ...parsed
    };
  } catch {
    return { ...DEFAULT_SETTINGS, dprCap: getDefaultDprCap() };
  }
}

export function savePixelPuckSettings(settings: PixelPuckSettings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage failures to avoid gameplay interruption
  }
}

export function updatePixelPuckSettings(update: Partial<PixelPuckSettings>) {
  const next = { ...loadPixelPuckSettings(), ...update };
  savePixelPuckSettings(next);
  return next;
}

export function getEffectsProfile(level: EffectsLevel) {
  if (level === 'off') {
    return { impacts: false, trail: false, glow: false, screenShake: false };
  }
  if (level === 'low') {
    return { impacts: true, trail: false, glow: true, screenShake: false };
  }
  return { impacts: true, trail: true, glow: true, screenShake: true };
}

export function clampDprCap(value: number) {
  return clamp(value, 1, 2.5);
}
