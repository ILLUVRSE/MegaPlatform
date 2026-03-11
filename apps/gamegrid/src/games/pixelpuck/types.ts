export type PixelPuckMode = 'first_to_7' | 'timed' | 'practice';
export type PixelPuckDifficulty = 'easy' | 'medium' | 'hard';
export type PixelPuckSensitivity = 'low' | 'medium' | 'high';

export interface PixelPuckScores {
  player: number;
  ai: number;
}

export interface PixelPuckMatchConfig {
  mode: PixelPuckMode;
  targetScore: number;
  timedDurationMs: number;
}

export interface PixelPuckMatchState {
  config: PixelPuckMatchConfig;
  scores: PixelPuckScores;
  elapsedMs: number;
  ended: boolean;
  winner: 'player' | 'ai' | 'none';
  suddenDeath: boolean;
}

export interface CircleObstacle {
  kind: 'circle';
  x: number;
  y: number;
  radius: number;
}

export interface RectObstacle {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

export type RinkObstacle = CircleObstacle | RectObstacle;

export interface RinkGeometry {
  id: string;
  name: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  goals: {
    top: { x: number; width: number; lineY: number };
    bottom: { x: number; width: number; lineY: number };
  };
  obstacles: RinkObstacle[];
}

export interface PaddleState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface PuckState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface SensitivityParams {
  maxSpeed: number;
  accel: number;
  smoothing?: number;
}
