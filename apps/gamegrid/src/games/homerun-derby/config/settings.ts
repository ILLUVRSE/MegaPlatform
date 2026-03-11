import type { HomerunDifficulty, HomerunMode } from '../types';
import type { AimAssistLevel, ControlScheme, EffectsLevel } from './tuning';
import type { CameraIntensity } from '../camera/CameraDirector';
import { GAME_CONFIG } from './gameConfig';

const SETTINGS_KEY = 'gamegrid.homerun-derby.settings.v3';

export interface HomerunSettings {
  mode: HomerunMode;
  difficulty: HomerunDifficulty;
  controlScheme: ControlScheme;
  timingAssist: boolean;
  aimAssist: AimAssistLevel;
  pitchTells: boolean;
  leftHandedHud: boolean;
  reducedMotion: boolean;
  reducedShake: boolean;
  cameraFollow: boolean;
  cameraIntensity: CameraIntensity;
  timingMeter: boolean;
  dragPreview: boolean;
  timingCue: boolean;
  showTimingDelta: boolean;
  showHitStats: boolean;
  swingButton: boolean;
  haptics: boolean;
  sfx: boolean;
  effects: EffectsLevel;
  dprCap: number;
  autoQuality: boolean;
  showPerfHud: boolean;
}

export const DEFAULT_SETTINGS: HomerunSettings = {
  mode: GAME_CONFIG.derby.defaultMode,
  difficulty: 'medium',
  controlScheme: 'drag_release',
  timingAssist: true,
  aimAssist: 'medium',
  pitchTells: true,
  leftHandedHud: false,
  reducedMotion: false,
  reducedShake: false,
  cameraFollow: true,
  cameraIntensity: 'medium',
  timingMeter: true,
  dragPreview: true,
  timingCue: true,
  showTimingDelta: true,
  showHitStats: false,
  swingButton: false,
  haptics: true,
  sfx: true,
  effects: 'high',
  dprCap: 1.75,
  autoQuality: true,
  showPerfHud: false
};

export function loadSettings(): HomerunSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<HomerunSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: HomerunSettings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Best effort storage.
  }
}

export const QUALITY_DEFAULTS = {
  effects: DEFAULT_SETTINGS.effects,
  dprCap: DEFAULT_SETTINGS.dprCap,
  autoQuality: DEFAULT_SETTINGS.autoQuality,
  showPerfHud: DEFAULT_SETTINGS.showPerfHud
};
