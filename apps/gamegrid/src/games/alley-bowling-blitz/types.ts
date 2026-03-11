export type BowlingMode = 'classic' | 'timed_blitz' | 'challenges';
export type BowlingDifficulty = 'easy' | 'medium' | 'hard';
export type Sensitivity = 'low' | 'medium' | 'high';

export interface BowlingOptions {
  spinAssist: boolean;
  showGuide: boolean;
  sensitivity: Sensitivity;
  vsAi: boolean;
}

export interface SwipeRelease {
  startX: number;
  startY: number;
  angle: number;
  speed: number;
  spin: number;
}

export interface LaneModel {
  left: number;
  right: number;
  top: number;
  bottom: number;
  gutterWidth: number;
  pinDeckY: number;
  oilBreakProgress: number;
  baseFriction: number;
  lateFriction: number;
  hookStrength: number;
}

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  active: boolean;
  inGutter: boolean;
  finished: boolean;
}

export interface PinState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angVel: number;
  fallen: boolean;
  sleeping: boolean;
  active: boolean;
}

export interface RollOutcome {
  pinsKnocked: number;
  isStrike: boolean;
  isSpare: boolean;
  isGutter: boolean;
}

export interface ClassicState {
  frame: number;
  rollInFrame: 1 | 2 | 3;
  pinsStanding: number;
  rolls: number[];
  ended: boolean;
}

export interface TimedBlitzState {
  timeRemainingMs: number;
  score: number;
  rolls: number;
  strikeStreak: number;
  rollInRack: 1 | 2;
  firstRollPins: number;
  ended: boolean;
}

export interface ScoreFrame {
  index: number;
  rolls: number[];
  base: number;
  bonus: number;
  total: number;
  runningTotal: number;
  isStrike: boolean;
  isSpare: boolean;
}

export interface ScoreCard {
  frames: ScoreFrame[];
  total: number;
}

export interface BowlingStats {
  strikes: number;
  spares: number;
  gutters: number;
  bestFrame: number;
  pinsKnocked: number;
}

export interface ChallengeGoalStrikeStreak {
  type: 'strike_streak';
  required: number;
}

export interface ChallengeGoalSpareInFrames {
  type: 'spares_in_frames';
  required: number;
  frameWindow: number;
}

export interface ChallengeGoalKnockTotal {
  type: 'knock_total';
  required: number;
}

export interface ChallengeGoalScoreMin {
  type: 'score_min';
  required: number;
}

export interface ChallengeGoalSplitConvert {
  type: 'split_convert';
  split: '7-10' | 'bucket';
  required: number;
}

export type ChallengeGoal =
  | ChallengeGoalStrikeStreak
  | ChallengeGoalSpareInFrames
  | ChallengeGoalKnockTotal
  | ChallengeGoalScoreMin
  | ChallengeGoalSplitConvert;

export interface BowlingChallenge {
  id: string;
  name: string;
  description: string;
  startingPins: number[];
  rollLimit: number;
  goal: ChallengeGoal;
}

export interface BowlingChallengeCatalog {
  challenges: BowlingChallenge[];
}

export interface ChallengeProgress {
  completed: Record<string, boolean>;
}

export interface ChallengeRuntimeStats {
  rollsUsed: number;
  strikeStreakMax: number;
  sparesInWindow: number;
  totalPinsKnocked: number;
  score: number;
  splitConverted: Record<'7-10' | 'bucket', number>;
}

export interface ChallengeEvaluation {
  passed: boolean;
  failed: boolean;
}

export type BowlerSide = 'player' | 'ai';

export interface MatchSummary {
  mode: BowlingMode;
  finalScore: number;
  stats: BowlingStats;
  durationMs: number;
  aiScore?: number;
}
