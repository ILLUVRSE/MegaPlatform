import type { HomerunDifficulty, HomerunMode, PitchType } from '../types';

export type PitchMix = readonly [PitchType, number][];

export interface DerbyModeConfig {
  defaultMode: HomerunMode;
  modeStyle: 'outs' | 'timed';
  outsLimit: number;
  timeLimitMs: number;
}

export interface SwipeConfig {
  minDistancePx: number;
  maxDurationMs: number;
  minDurationMs: number;
  speedNormMin: number;
  speedNormMax: number;
  speedCurvePower: number;
  swingPeakOffsetMs: number;
  zonePadPx: number;
  replayPathMaxPoints: number;
}

export interface ContactConfig {
  sweetSpotRadiusPx: number;
  perfectSweetSpotRadiusPx: number;
  foulSprayThresholdDeg: number;
  perfectSlowMoMs: number;
  perfectSlowMoScale: number;
  tinyRandomness: number;
}

export interface TutorialConfig {
  enabled: boolean;
  step1Ms: number;
  step3Ms: number;
  slowPitchSpeedScale: number;
  maxTotalMs: number;
}

export interface ReplayConfig {
  pathDownsampleStep: number;
}

export interface HomerunGameConfig {
  derby: DerbyModeConfig;
  swipe: SwipeConfig;
  contact: ContactConfig;
  tutorial: TutorialConfig;
  replay: ReplayConfig;
  pitchMixByDifficulty: Record<HomerunDifficulty, PitchMix>;
}

export const GAME_CONFIG: HomerunGameConfig = {
  derby: {
    defaultMode: 'classic_10',
    modeStyle: 'outs',
    outsLimit: 10,
    timeLimitMs: 60000
  },
  swipe: {
    minDistancePx: 28,
    maxDurationMs: 420,
    minDurationMs: 16,
    speedNormMin: 0.35,
    speedNormMax: 2.8,
    speedCurvePower: 0.75,
    swingPeakOffsetMs: 8,
    zonePadPx: 24,
    replayPathMaxPoints: 14
  },
  contact: {
    sweetSpotRadiusPx: 34,
    perfectSweetSpotRadiusPx: 16,
    foulSprayThresholdDeg: 31,
    perfectSlowMoMs: 70,
    perfectSlowMoScale: 0.45,
    tinyRandomness: 0.025
  },
  tutorial: {
    enabled: true,
    step1Ms: 3200,
    step3Ms: 2600,
    slowPitchSpeedScale: 0.78,
    maxTotalMs: 14000
  },
  replay: {
    pathDownsampleStep: 2
  },
  pitchMixByDifficulty: {
    easy: [
      ['fastball', 0.52],
      ['curveball', 0.2],
      ['slider', 0.14],
      ['changeup', 0.1],
      ['splitter', 0.04]
    ],
    medium: [
      ['fastball', 0.45],
      ['curveball', 0.22],
      ['slider', 0.2],
      ['changeup', 0.09],
      ['splitter', 0.04]
    ],
    hard: [
      ['fastball', 0.34],
      ['curveball', 0.24],
      ['slider', 0.22],
      ['changeup', 0.12],
      ['splitter', 0.08]
    ],
    pro: [
      ['fastball', 0.3],
      ['curveball', 0.22],
      ['slider', 0.24],
      ['changeup', 0.12],
      ['splitter', 0.12]
    ]
  }
};
