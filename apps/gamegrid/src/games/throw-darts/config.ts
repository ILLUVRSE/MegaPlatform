import type {
  ThrowDartsAimMode,
  ThrowDartsAssistLevel,
  ThrowDartsDifficulty,
  ThrowDartsHandedness,
  ThrowDartsSensitivity,
  ThrowDartsVfxLevel
} from './types';

export interface ThrowDartsSettings {
  mode: '301' | '501' | 'cricket';
  matchType: 'vs_ai' | 'local' | 'practice';
  difficulty: ThrowDartsDifficulty;
  sensitivity: ThrowDartsSensitivity;
  aimMode: ThrowDartsAimMode;
  assistLevel: ThrowDartsAssistLevel;
  reducedRandomness: boolean;
  timingMeter: boolean;
  doubleOut: boolean;
  haptics: boolean;
  sfx: boolean;
  handedness: ThrowDartsHandedness;
  showCheckout: boolean;
  showCoach: boolean;
  vfxLevel: ThrowDartsVfxLevel;
  dprCap: number;
  autoQuality: boolean;
}

export interface ThrowDartsDifficultyTuning {
  aimNoise: number;
  timingSpread: number;
  checkoutFocus: number;
}

export interface ThrowDartsTuning {
  aimAssistStrength: number;
  pullbackPowerScale: number;
  flickSpeedScale: number;
  aimSmoothing: number;
  aimPredictionMs: number;
  randomnessBase: number;
  randomnessMin: number;
  randomnessMax: number;
  maxStuckDarts: number;
  coachFadeMs: number;
  difficulty: Record<ThrowDartsDifficulty, ThrowDartsDifficultyTuning>;
}

const SETTINGS_KEY = 'gamegrid.throw-darts.settings.v2';
const TUNING_KEY = 'gamegrid.throw-darts.tuning.v1';

export const DEFAULT_SETTINGS: ThrowDartsSettings = {
  mode: '301',
  matchType: 'vs_ai',
  difficulty: 'medium',
  sensitivity: 'medium',
  aimMode: 'pullback',
  assistLevel: 'low',
  reducedRandomness: false,
  timingMeter: false,
  doubleOut: true,
  haptics: true,
  sfx: true,
  handedness: 'right',
  showCheckout: true,
  showCoach: true,
  vfxLevel: 'high',
  dprCap: 1.75,
  autoQuality: true
};

export const DEFAULT_TUNING: ThrowDartsTuning = {
  aimAssistStrength: 0.12,
  pullbackPowerScale: 230,
  flickSpeedScale: 1.2,
  aimSmoothing: 0.18,
  aimPredictionMs: 30,
  randomnessBase: 0.02,
  randomnessMin: 0.005,
  randomnessMax: 0.09,
  maxStuckDarts: 6,
  coachFadeMs: 3600,
  difficulty: {
    easy: { aimNoise: 0.11, timingSpread: 0.42, checkoutFocus: 0.3 },
    medium: { aimNoise: 0.07, timingSpread: 0.24, checkoutFocus: 0.5 },
    hard: { aimNoise: 0.04, timingSpread: 0.14, checkoutFocus: 0.75 },
    pro: { aimNoise: 0.025, timingSpread: 0.08, checkoutFocus: 0.9 }
  }
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<T>;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export function loadThrowDartsSettings(): ThrowDartsSettings {
  return readJson(SETTINGS_KEY, DEFAULT_SETTINGS);
}

export function saveThrowDartsSettings(settings: ThrowDartsSettings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

export function loadThrowDartsTuning(): ThrowDartsTuning {
  const base = readJson(TUNING_KEY, DEFAULT_TUNING);
  const override = (window as Window & { __throwDartsTuning?: Partial<ThrowDartsTuning> }).__throwDartsTuning;
  if (!override) return base;
  return {
    ...base,
    ...override,
    difficulty: {
      ...base.difficulty,
      ...(override.difficulty ?? {})
    }
  };
}
