import type { FreethrowControls, FreethrowDifficulty, FreethrowOpponent, FreethrowSensitivity } from '../types';
import { QUALITY_DEFAULTS, type EffectsLevel } from './tuning';

const SETTINGS_KEY = 'gamegrid.freethrow-frenzy.settings.v2';

export interface FreethrowSettings {
  mode: 'timed_60' | 'three_point_contest' | 'horse';
  difficulty: FreethrowDifficulty;
  controls: FreethrowControls;
  sensitivity: FreethrowSensitivity;
  timingMeter: boolean;
  pressure: boolean;
  assist: boolean;
  opponent: FreethrowOpponent;
  moneyRack: boolean;
  deepRange: boolean;
  overtime: boolean;
  colorblindMeter: boolean;
  leftHandedHud: boolean;
  simplifiedControls: boolean;
  reducedMotionPlus: boolean;
  aiPersonality: 'balanced' | 'clutch' | 'streaky' | 'conservative';
  effects: EffectsLevel;
  dprCap: number;
  autoQuality: boolean;
  haptics: boolean;
  sfx: boolean;
  showPerfHud: boolean;
}

export const DEFAULT_SETTINGS: FreethrowSettings = {
  mode: 'timed_60',
  difficulty: 'medium',
  controls: 'hold_release',
  sensitivity: 'medium',
  timingMeter: true,
  pressure: true,
  assist: true,
  opponent: 'ai',
  moneyRack: false,
  deepRange: false,
  overtime: true,
  colorblindMeter: false,
  leftHandedHud: false,
  simplifiedControls: false,
  reducedMotionPlus: false,
  aiPersonality: 'balanced',
  effects: QUALITY_DEFAULTS.effects,
  dprCap: QUALITY_DEFAULTS.dprCap,
  autoQuality: QUALITY_DEFAULTS.autoQuality,
  haptics: true,
  sfx: true,
  showPerfHud: QUALITY_DEFAULTS.showPerfHud
};

export function loadSettings(): FreethrowSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<FreethrowSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: FreethrowSettings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Keep gameplay alive when storage fails.
  }
}
