export type MinigolfTheme = 'classic' | 'neon' | 'backyard';

export type MinigolfMode = 'stroke' | 'time_attack' | 'ghost';

export type MinigolfSensitivity = 'low' | 'medium' | 'high';

export type SurfaceMaterial = 'normal' | 'sand' | 'ice';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface CircleBumper {
  kind: 'circle';
  x: number;
  y: number;
  radius: number;
}

export interface RectBumper {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Bumper = CircleBumper | RectBumper;

export interface WaterRect {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WaterPolygon {
  kind: 'polygon';
  points: Vec2[];
}

export type WaterHazard = WaterRect | WaterPolygon;

export interface SurfaceZone {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  material: SurfaceMaterial;
}

export interface SlopeZone {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  forceX: number;
  forceY: number;
  sampleCols?: number;
  sampleRows?: number;
  sampleForces?: number[];
}

export interface MovingObstacle {
  id: string;
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  axis: 'x' | 'y';
  range: number;
  speed: number;
  phase: number;
}

export interface HoleHazards {
  water: WaterHazard[];
  surfaces: SurfaceZone[];
  slopes: SlopeZone[];
}

export interface HoleBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MinigolfHole {
  id: string;
  name: string;
  theme: MinigolfTheme;
  par: number;
  bounds: HoleBounds;
  start: Vec2;
  cup: Vec2 & { radius: number };
  walls: Segment[];
  bumpers: Bumper[];
  hazards: HoleHazards;
  movingObstacles: MovingObstacle[];
}

export interface MinigolfCourse {
  holes: MinigolfHole[];
}

export interface MinigolfOptions {
  mode: MinigolfMode;
  courseSelection: 'all_18' | MinigolfTheme | 'practice';
  practiceHoleId: string | null;
  previewLine: boolean;
  ballCam: boolean;
  assist: boolean;
  sensitivity: MinigolfSensitivity;
}

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angularVelocity: number;
  radius: number;
  moving: boolean;
  restFrames: number;
  stopTimerMs?: number;
}

export interface PhysicsConfig {
  restitution: number;
  rollingFriction: number;
  slidingFriction: number;
  sandRollingFriction: number;
  sandSlidingFriction: number;
  iceRollingFriction: number;
  iceSlidingFriction: number;
  sleepEnterLinearSpeed: number;
  sleepExitLinearSpeed: number;
  sleepEnterAngularSpeed: number;
  sleepExitAngularSpeed: number;
  sleepFrames: number;
  maxSlopeAccel: number;
  fixedDtSec: number;
  maxSubstepsPerFrame: number;
}

export interface PhysicsScratch {
  closestX: number;
  closestY: number;
  normalX: number;
  normalY: number;
}

export interface PhysicsStepResult {
  hitWall: boolean;
  hitSand: boolean;
  enteredWater: boolean;
  sunk: boolean;
}

export interface MinigolfSessionSummary {
  totalStrokes: number;
  totalPar: number;
  parDelta: number;
  bestHole: { id: string; delta: number } | null;
  worstHole: { id: string; delta: number } | null;
  totalTimeMs: number;
  holesPlayed: number;
}

export interface HoleProgress {
  holeId: string;
  par: number;
  strokes: number;
  timeMs: number;
}

export interface MinigolfSessionState {
  mode: MinigolfMode;
  practice: boolean;
  holeOrder: string[];
  currentHoleIndex: number;
  currentHoleStrokes: number;
  currentHoleTimeMs: number;
  timePenaltyMs: number;
  elapsedMs: number;
  completedHoles: HoleProgress[];
  finished: boolean;
}

export interface GhostPoint {
  t: number;
  x: number;
  y: number;
}

export interface GhostRun {
  holeId: string;
  points: GhostPoint[];
}

export interface ShotInput {
  angle: number;
  power: number;
}
