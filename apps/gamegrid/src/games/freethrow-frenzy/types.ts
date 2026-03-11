export type FreethrowMode = 'timed_60' | 'three_point_contest' | 'horse';

export type FreethrowDifficulty = 'easy' | 'medium' | 'hard' | 'pro';

export type FreethrowControls = 'arc_swipe' | 'hold_release';

export type FreethrowSensitivity = 'low' | 'medium' | 'high';

export type FreethrowOpponent = 'ai' | 'local';

export type ShotSpotId =
  | 'free_throw'
  | 'midrange'
  | 'three_point'
  | 'left_corner'
  | 'left_wing'
  | 'top_arc'
  | 'right_wing'
  | 'right_corner';

export interface ShotSpotProfile {
  id: ShotSpotId;
  label: string;
  basePoints: number;
  distanceScore: number;
  releaseX: number;
  releaseY: number;
  aimSpreadPx: number;
  targetPower: number;
}

export interface FreethrowOptions {
  mode: FreethrowMode;
  difficulty: FreethrowDifficulty;
  controls: FreethrowControls;
  sensitivity: FreethrowSensitivity;
  timingMeter: boolean;
  pressure: boolean;
  assist: boolean;
  opponent: FreethrowOpponent;
}

export interface ShotInput {
  aim: number;
  power: number;
  meterPhase: number;
  controlScheme: FreethrowControls;
}

export interface ShotEvaluationContext {
  spot: ShotSpotProfile;
  difficulty: FreethrowDifficulty;
  timingMeter: boolean;
  pressureEnabled: boolean;
  pressure: number;
  assist: boolean;
  hoopX: number;
  hoopY: number;
  rimRadius: number;
  backboardX: number;
}

export interface ShotArcParams {
  releaseX: number;
  releaseY: number;
  targetX: number;
  targetY: number;
  flightTime: number;
  gravity: number;
  velocityX: number;
  velocityY: number;
  timingWindow: number;
  timingQuality: number;
  timingBucket?: 'early' | 'perfect' | 'good' | 'late';
  pressurePenalty: number;
  predictedMakeChance: number;
}

export type ShotContact = 'swish' | 'rim' | 'backboard' | 'airball';

export interface ShotOutcome {
  made: boolean;
  points: number;
  swish: boolean;
  rimHit: boolean;
  backboardHit: boolean;
  contact: ShotContact;
  finalX: number;
  finalY: number;
  scoreQuality: number;
}

export interface ShotAttemptSummary {
  made: boolean;
  points: number;
}

export interface TimedModeState {
  kind: 'timed_60';
  timeRemainingMs: number;
  score: number;
  attempts: number;
  makes: number;
  streak: number;
  bestStreak: number;
  multiplier: number;
  ended: boolean;
}

export interface ThreePointContestState {
  kind: 'three_point_contest';
  score: number;
  attempts: number;
  makes: number;
  currentSpotIndex: number;
  ballInRack: number;
  totalBallsShot: number;
  ended: boolean;
}

export type HorsePhase = 'set_challenge' | 'answer' | 'ended';

export interface HorseModeState {
  kind: 'horse';
  shooter: 0 | 1;
  responder: 0 | 1;
  phase: HorsePhase;
  challengeSpot: ShotSpotId | null;
  playerLetters: [number, number];
  attempts: [number, number];
  makes: [number, number];
  winner: 0 | 1 | null;
  ended: boolean;
}

export type FreethrowModeState = TimedModeState | ThreePointContestState | HorseModeState;

export interface MatchSummary {
  score: number;
  accuracy: number;
  bestStreak: number;
  durationMs: number;
}

export const MAX_STREAK_MULTIPLIER = 3;

export const HORSE_WORD = 'HORSE';

export const TIMED_MODE_DURATION_MS = 60_000;

export const THREE_POINT_RACK_SIZE = 5;

export const THREE_POINT_RACK_ORDER: readonly ShotSpotId[] = [
  'left_corner',
  'left_wing',
  'top_arc',
  'right_wing',
  'right_corner'
] as const;

export const SHOT_SPOTS: Record<ShotSpotId, ShotSpotProfile> = {
  free_throw: {
    id: 'free_throw',
    label: 'Free Throw',
    basePoints: 1,
    distanceScore: 1,
    releaseX: 640,
    releaseY: 550,
    aimSpreadPx: 110,
    targetPower: 0.52
  },
  midrange: {
    id: 'midrange',
    label: 'Midrange',
    basePoints: 2,
    distanceScore: 2,
    releaseX: 520,
    releaseY: 580,
    aimSpreadPx: 145,
    targetPower: 0.62
  },
  three_point: {
    id: 'three_point',
    label: 'Three-Point',
    basePoints: 3,
    distanceScore: 3,
    releaseX: 420,
    releaseY: 610,
    aimSpreadPx: 185,
    targetPower: 0.73
  },
  left_corner: {
    id: 'left_corner',
    label: 'Left Corner',
    basePoints: 3,
    distanceScore: 3,
    releaseX: 300,
    releaseY: 620,
    aimSpreadPx: 165,
    targetPower: 0.76
  },
  left_wing: {
    id: 'left_wing',
    label: 'Left Wing',
    basePoints: 3,
    distanceScore: 3,
    releaseX: 380,
    releaseY: 600,
    aimSpreadPx: 175,
    targetPower: 0.74
  },
  top_arc: {
    id: 'top_arc',
    label: 'Top Arc',
    basePoints: 3,
    distanceScore: 3,
    releaseX: 470,
    releaseY: 592,
    aimSpreadPx: 185,
    targetPower: 0.72
  },
  right_wing: {
    id: 'right_wing',
    label: 'Right Wing',
    basePoints: 3,
    distanceScore: 3,
    releaseX: 560,
    releaseY: 600,
    aimSpreadPx: 175,
    targetPower: 0.74
  },
  right_corner: {
    id: 'right_corner',
    label: 'Right Corner',
    basePoints: 3,
    distanceScore: 3,
    releaseX: 640,
    releaseY: 620,
    aimSpreadPx: 165,
    targetPower: 0.76
  }
};

export const TIMED_SPOT_ORDER: readonly ShotSpotId[] = ['free_throw', 'midrange', 'three_point'] as const;
