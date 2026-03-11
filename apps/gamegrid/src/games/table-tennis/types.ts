export type PlayerIndex = 0 | 1;

export type TableTennisDifficulty = 'easy' | 'medium' | 'hard';

export type TableTennisSensitivity = 'low' | 'medium' | 'high';

export type TableTennisMode = 'quick_match' | 'best_of_3' | 'practice';

export type MatchFormat = 'single_game' | 'best_of_3';

export type SpinHint = 'top' | 'back' | 'none';

export interface TableTennisOptions {
  mode: TableTennisMode;
  difficulty: TableTennisDifficulty;
  assist: boolean;
  spinAssist: boolean;
  showTrajectory: boolean;
  sensitivity: TableTennisSensitivity;
}

export interface SwipeMetrics {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  durationMs: number;
  distance: number;
  horizontal: number;
  vertical: number;
  curve: number;
  topComponent: number;
}

export interface PaddleShot {
  dirX: number;
  speed: number;
  spin: number;
  spinHint: SpinHint;
}

export interface BallState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  spinX: number;
  spinY: number;
  active: boolean;
  lastHitter: PlayerIndex | null;
  bouncesOnPlayer: number;
  bouncesOnAi: number;
}

export type PointEndReason = 'net' | 'out' | 'double_bounce' | 'miss';

export interface PhysicsStepResult {
  ended: boolean;
  winner: PlayerIndex | null;
  reason: PointEndReason | null;
  bounceSide: PlayerIndex | -1;
}

export interface ScoringState {
  format: MatchFormat;
  targetGames: number;
  gamesWon: [number, number];
  points: [number, number];
  totalPointsInGame: number;
  gameIndex: number;
  firstServer: PlayerIndex;
  currentServer: PlayerIndex;
  matchWinner: PlayerIndex | null;
}

export interface PracticeState {
  totalBalls: number;
  ballsTaken: number;
  score: number;
  targetHits: number;
  lastAward: number;
  ended: boolean;
}

export interface MatchStats {
  rallies: number;
  winners: number;
  unforcedErrors: number;
}

export interface AiProfile {
  reactionMs: number;
  moveSpeed: number;
  missChance: number;
  spinControl: number;
  aggression: number;
}

export interface AiDecision {
  aimX: number;
  speed: number;
  spin: number;
  aggressive: boolean;
  miss: boolean;
}

export interface TablePhysicsConfig {
  gravity: number;
  netHeight: number;
  tableHalfWidth: number;
  tableHalfLength: number;
  maxStepS: number;
  bounceRestitution: number;
  spinDrift: number;
  spinDrive: number;
  bounceCurve: number;
}

export interface PhysicsScratch {
  previousY: number;
}
