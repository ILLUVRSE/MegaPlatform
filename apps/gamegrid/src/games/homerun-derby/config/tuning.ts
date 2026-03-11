export type EffectsLevel = 'off' | 'low' | 'high';

export type AimAssistLevel = 'off' | 'low' | 'medium';

export type ControlScheme = 'timing_tap' | 'drag_release';

export interface TimingWindowTuning {
  perfectMs: number;
  earlyLateMs: number;
  assistScale: number;
  cueLeadMs: number;
}

export interface PitchDifficultyTuning {
  speedMin: number;
  speedMax: number;
  breakMin: number;
  breakMax: number;
  verticalMin: number;
  verticalMax: number;
  windupMin: number;
  windupMax: number;
  intervalMin: number;
  intervalMax: number;
}

export interface PitchTuning {
  easy: PitchDifficultyTuning;
  medium: PitchDifficultyTuning;
  hard: PitchDifficultyTuning;
  pro: PitchDifficultyTuning;
}

export interface ContactTuning {
  baseExitVelocity: number;
  timingVelocityScale: number;
  aimVelocityScale: number;
  perfectVelocityBoost: number;
  launchBase: number;
  launchTimingAdjust: number;
  launchAimAdjust: number;
  launchPlaneAdjust: number;
  maxLaunch: number;
  minLaunch: number;
}

export interface FlightTuning {
  gravityFt: number;
  pxPerFoot: number;
  foulAngleDeg: number;
  minDistance: number;
  maxDistance: number;
  homeRunDistance: number;
  maxSprayDeg: number;
  windupHoldMs: number;
}

export interface ScoringTuning {
  multiplierCap: number;
  hrBaseScore: number;
  distanceBonusScale: number;
  distanceBonusStart: number;
}

export interface InputTuning {
  swingCooldownMs: number;
  aimDeadzonePx: number;
  aimStepPx: number;
  dragSwingThresholdPx: number;
}

export interface CameraTuning {
  followDistanceFt: number;
  zoomOut: number;
  panDurationMs: number;
}

export interface VfxTuning {
  trailDots: number;
  trailLife: number;
  confettiCount: number;
  sparkCount: number;
}

export interface HomerunTuning {
  timing: TimingWindowTuning;
  pitch: PitchTuning;
  contact: ContactTuning;
  flight: FlightTuning;
  scoring: ScoringTuning;
  input: InputTuning;
  camera: CameraTuning;
  vfx: VfxTuning;
}

export const DEFAULT_TUNING: HomerunTuning = {
  timing: {
    perfectMs: 32,
    earlyLateMs: 110,
    assistScale: 1.18,
    cueLeadMs: 120
  },
  pitch: {
    easy: {
      speedMin: 620,
      speedMax: 790,
      breakMin: 14,
      breakMax: 78,
      verticalMin: -26,
      verticalMax: 20,
      windupMin: 680,
      windupMax: 900,
      intervalMin: 920,
      intervalMax: 1260
    },
    medium: {
      speedMin: 700,
      speedMax: 880,
      breakMin: 20,
      breakMax: 96,
      verticalMin: -32,
      verticalMax: 26,
      windupMin: 600,
      windupMax: 820,
      intervalMin: 800,
      intervalMax: 1120
    },
    hard: {
      speedMin: 800,
      speedMax: 980,
      breakMin: 26,
      breakMax: 116,
      verticalMin: -36,
      verticalMax: 32,
      windupMin: 500,
      windupMax: 720,
      intervalMin: 720,
      intervalMax: 980
    },
    pro: {
      speedMin: 860,
      speedMax: 1060,
      breakMin: 30,
      breakMax: 130,
      verticalMin: -38,
      verticalMax: 36,
      windupMin: 460,
      windupMax: 660,
      intervalMin: 680,
      intervalMax: 940
    }
  },
  contact: {
    baseExitVelocity: 56,
    timingVelocityScale: 54,
    aimVelocityScale: 28,
    perfectVelocityBoost: 14,
    launchBase: 22,
    launchTimingAdjust: 10,
    launchAimAdjust: 8,
    launchPlaneAdjust: 10,
    maxLaunch: 50,
    minLaunch: 6
  },
  flight: {
    gravityFt: 31.2,
    pxPerFoot: 2.1,
    foulAngleDeg: 33,
    minDistance: 80,
    maxDistance: 500,
    homeRunDistance: 330,
    maxSprayDeg: 34,
    windupHoldMs: 260
  },
  scoring: {
    multiplierCap: 3,
    hrBaseScore: 120,
    distanceBonusScale: 0.52,
    distanceBonusStart: 250
  },
  input: {
    swingCooldownMs: 100,
    aimDeadzonePx: 18,
    aimStepPx: 44,
    dragSwingThresholdPx: 28
  },
  camera: {
    followDistanceFt: 360,
    zoomOut: 0.9,
    panDurationMs: 380
  },
  vfx: {
    trailDots: 40,
    trailLife: 0.26,
    confettiCount: 40,
    sparkCount: 24
  }
};

const TUNING_KEY = 'gamegrid.homerun-derby.tuning.v1';

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge<T>(base: T, override: unknown): T {
  if (!isObject(base) || !isObject(override)) return base;
  const result = { ...(base as Record<string, unknown>) } as Record<string, unknown>;
  for (const [key, value] of Object.entries(override)) {
    if (isObject(value) && isObject(result[key])) {
      result[key] = deepMerge(result[key], value);
    } else if (typeof value !== 'undefined') {
      result[key] = value;
    }
  }
  return result as T;
}

export function loadTuning(): HomerunTuning {
  try {
    const raw = window.localStorage.getItem(TUNING_KEY);
    if (!raw) return DEFAULT_TUNING;
    const parsed = JSON.parse(raw) as Partial<HomerunTuning>;
    return deepMerge(DEFAULT_TUNING, parsed);
  } catch {
    return DEFAULT_TUNING;
  }
}

export function saveTuning(tuning: HomerunTuning) {
  try {
    window.localStorage.setItem(TUNING_KEY, JSON.stringify(tuning));
  } catch {
    // Best effort only.
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
