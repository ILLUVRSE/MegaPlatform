export type FoosballMode = 'first_to_5' | 'timed' | 'training';
export type FoosballDifficulty = 'easy' | 'medium' | 'hard';
export type FoosballSensitivity = 'low' | 'medium' | 'high';
export type TeamSide = 'player' | 'ai';

export type RodRole = 'goalkeeper' | 'defense' | 'midfield' | 'strikers';

export interface FoosballOptions {
  mode: FoosballMode;
  difficulty: FoosballDifficulty;
  autoSelectRod: boolean;
  shootAssist: boolean;
  showZones: boolean;
  sensitivity: FoosballSensitivity;
}

export interface StoredSettings extends FoosballOptions {
  timedSeconds: number;
}

export interface MatchStats {
  shots: [number, number];
  passes: [number, number];
  saves: [number, number];
}

export interface MatchState {
  mode: Exclude<FoosballMode, 'training'>;
  targetScore: number;
  timedSeconds: number;
  score: [number, number];
  remainingMs: number;
  suddenDeath: boolean;
  ended: boolean;
  winner: TeamSide | 'draw' | null;
}

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  restFrames: number;
}

export interface TableBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  goalTop: number;
  goalBottom: number;
  centerX: number;
  centerY: number;
}

export interface RodPlayer {
  x: number;
  y: number;
  radius: number;
  team: TeamSide;
  rodIndex: number;
  role: RodRole;
}

export interface RodState {
  index: number;
  team: TeamSide;
  role: RodRole;
  x: number;
  y: number;
  targetY: number;
  minY: number;
  maxY: number;
  speed: number;
  selected: boolean;
  locked: boolean;
  manOffsets: readonly number[];
  manualUntilMs: number;
  players: RodPlayer[];
}

export interface RodSelectionState {
  selectedIndex: number;
  manualUntilMs: number;
}

export interface KickIntent {
  rodIndex: number;
  strength: number;
  isPass: boolean;
}

export interface InputState {
  activePointerId: number | null;
  downX: number;
  downY: number;
  lastX: number;
  lastY: number;
  downTimeMs: number;
  dragging: boolean;
}

export interface PhysicsStepResult {
  goalScoredBy: TeamSide | null;
  wallHit: boolean;
  rodHitBy: TeamSide | null;
  antiPinningApplied: boolean;
}

export interface PhysicsScratch {
  stepResult: PhysicsStepResult;
}

export interface AiState {
  nextReactionAtMs: number;
  missUntilMs: number;
  lastKickAtMs: number;
  passBias: number;
  focusRodIndex: number;
}

export type DrillGoalType = 'score' | 'block' | 'pass_chain';

export interface DrillGoal {
  type: DrillGoalType;
  target: number;
}

export interface DrillStartBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface DrillDefinition {
  id: string;
  title: string;
  instructions: string;
  goal: DrillGoal;
  timeLimitSec?: number;
  startBall: DrillStartBall;
  activeRods: RodRole[];
  lockedRods: RodRole[];
}

export interface DrillCatalog {
  drills: DrillDefinition[];
}

export interface DrillProgress {
  completed: Record<string, boolean>;
}

export interface ActiveDrillState {
  drillId: string;
  goalType: DrillGoalType;
  target: number;
  progress: number;
  remainingMs: number | null;
  completed: boolean;
  failed: boolean;
}

export type DrillEventType = 'score' | 'block' | 'pass';

export interface DrillEvent {
  type: DrillEventType;
  amount?: number;
}

export interface SceneStats {
  shots: [number, number];
  passes: [number, number];
  saves: [number, number];
}
