export type EffectsLevel = 'off' | 'low' | 'high';

export type TimingBucket = 'early' | 'perfect' | 'good' | 'late';

export interface TimingTuning {
  periodMs: number;
  greenWindow: number;
  yellowWindow: number;
  pressureShrink: number;
}

export interface DifficultyPreset {
  timingScale: number;
  pressureScale: number;
  aimVariance: number;
  powerVariance: number;
  rimForgiveness: number;
}

export interface PressureTuning {
  streakBoost: number;
  timeBoost: number;
  baseEasy: number;
  baseMedium: number;
  baseHard: number;
  basePro: number;
  clampMin: number;
  clampMax: number;
}

export interface HeatTuning {
  maxLevel: number;
  swishGain: number;
  makeGain: number;
  missLoss: number;
  scoreMultiplierStep: number;
}

export interface SpawnTuning {
  minResetMs: number;
  reboundQuickMs: number;
  reboundLongMs: number;
  shotCooldownMs: number;
}

export const TIMING_TUNING: TimingTuning = {
  periodMs: 1050,
  greenWindow: 0.1,
  yellowWindow: 0.2,
  pressureShrink: 0.16
};

export const DIFFICULTY_PRESETS: Record<'easy' | 'medium' | 'hard' | 'pro', DifficultyPreset> = {
  easy: {
    timingScale: 1.15,
    pressureScale: 0.7,
    aimVariance: 0.32,
    powerVariance: 0.24,
    rimForgiveness: 0.12
  },
  medium: {
    timingScale: 1,
    pressureScale: 1,
    aimVariance: 0.2,
    powerVariance: 0.16,
    rimForgiveness: 0.05
  },
  hard: {
    timingScale: 0.9,
    pressureScale: 1.2,
    aimVariance: 0.12,
    powerVariance: 0.1,
    rimForgiveness: 0
  },
  pro: {
    timingScale: 0.82,
    pressureScale: 1.35,
    aimVariance: 0.08,
    powerVariance: 0.08,
    rimForgiveness: 0
  }
};

export const PRESSURE_TUNING: PressureTuning = {
  streakBoost: 0.11,
  timeBoost: 0.035,
  baseEasy: 0.12,
  baseMedium: 0.22,
  baseHard: 0.32,
  basePro: 0.4,
  clampMin: 0,
  clampMax: 1
};

export const HEAT_TUNING: HeatTuning = {
  maxLevel: 8,
  swishGain: 2,
  makeGain: 1,
  missLoss: 2,
  scoreMultiplierStep: 0.08
};

export const SPAWN_TUNING: SpawnTuning = {
  minResetMs: 220,
  reboundQuickMs: 0.2,
  reboundLongMs: 0.5,
  shotCooldownMs: 240
};

export const QUALITY_DEFAULTS = {
  effects: 'high' as EffectsLevel,
  dprCap: 1.75,
  autoQuality: true,
  showPerfHud: false
};

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
