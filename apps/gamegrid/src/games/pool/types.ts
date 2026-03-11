export type PoolVariant = 'eight_ball' | 'nine_ball';
export type PoolMode = 'eight_ball' | 'nine_ball' | 'practice' | 'trick_shots';
export type OpponentMode = 'vs_ai' | 'hotseat';
export type AIDifficulty = 'easy' | 'medium' | 'hard';
export type PlayerIndex = 0 | 1;

export type BallKind = 'cue' | 'solid' | 'stripe' | 'eight' | 'nine';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Pocket {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface TableBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface TableGeometry {
  bounds: TableBounds;
  ballRadius: number;
  pockets: Pocket[];
  pocketCaptureRadius: number;
  railRestitution: number;
  ballRestitution: number;
  friction: number;
  sleepSpeed: number;
}

export interface PoolBall {
  id: number;
  number: number;
  kind: BallKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spinX: number;
  spinY: number;
  pocketed: boolean;
}

export interface PhysicsEvent {
  cueFirstObjectHit: number | null;
  railAfterContact: boolean;
  pocketed: number[];
  cuePocketed: boolean;
  anyContact: boolean;
}

export interface PhysicsStepResult {
  moving: boolean;
  event: PhysicsEvent;
}

export interface PhysicsStepScratch {
  maxSubSteps: number;
}

export interface ShotOptions {
  strictRules: boolean;
}

export type EightGroup = 'open' | 'solids' | 'stripes';

export interface EightState {
  groups: [EightGroup, EightGroup];
  remainingSolids: number;
  remainingStripes: number;
}

export interface RuleState {
  variant: PoolVariant;
  currentPlayer: PlayerIndex;
  ballInHand: boolean;
  winner: PlayerIndex | null;
  ended: boolean;
  endReason: string | null;
  eight: EightState;
}

export interface ShotResolutionInput {
  state: RuleState;
  strictRules: boolean;
  firstObjectHit: number | null;
  lowestBallBeforeShot: number | null;
  cuePocketed: boolean;
  pocketed: number[];
  railAfterContact: boolean;
  ballsRemaining: number[];
}

export interface ShotResolution {
  nextState: RuleState;
  foul: boolean;
  foulReason: string | null;
  keepTurn: boolean;
  winner: PlayerIndex | null;
  endReason: string | null;
  assignedGroup: EightGroup | null;
}

export interface PoolOptions {
  ghostBall: boolean;
  spinControl: boolean;
  strictRules: boolean;
  shotTimerEnabled: boolean;
  shotTimerSec: number;
}

export interface MatchSetup {
  mode: PoolMode;
  opponent: OpponentMode;
  difficulty: AIDifficulty;
  options: PoolOptions;
  trickShotId: string | null;
}

export interface MatchStats {
  shots: [number, number];
  pots: [number, number];
  fouls: [number, number];
}

export interface AimState {
  active: boolean;
  pointerId: number;
  aimX: number;
  aimY: number;
  power: number;
  canceled: boolean;
}

export interface SpinState {
  open: boolean;
  x: number;
  y: number;
}

export interface AIPlan {
  direction: Vec2;
  power: number;
  spinX: number;
  spinY: number;
  targetBall: number | null;
  intendedPocketId: string | null;
  isSafety: boolean;
}

export interface TrickShotGoal {
  type: 'pocket_ball';
  ballNumber: number;
  pocketId?: string;
}

export interface TrickShotBall {
  number: number;
  x: number;
  y: number;
}

export interface TrickShotDefinition {
  id: string;
  title: string;
  description: string;
  variant: PoolVariant;
  mustUseSpin?: boolean;
  balls: TrickShotBall[];
  goal: TrickShotGoal;
}

export interface TrickShotCatalog {
  shots: TrickShotDefinition[];
}

export interface TrickShotProgress {
  bestAttempts: Record<string, number>;
}
