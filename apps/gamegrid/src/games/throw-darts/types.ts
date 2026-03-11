export type ThrowDartsMode = 'practice' | '301' | '501' | 'cricket';

export type ThrowDartsMatchType = 'practice' | 'vs_ai' | 'local';

export type ThrowDartsDifficulty = 'easy' | 'medium' | 'hard' | 'pro';

export type ThrowDartsSensitivity = 'low' | 'medium' | 'high';

export type ThrowDartsAimMode = 'pullback' | 'flick';

export type ThrowDartsAssistLevel = 'off' | 'low';

export type ThrowDartsVfxLevel = 'off' | 'low' | 'high';

export type ThrowDartsHandedness = 'right' | 'left';

export type ThrowDartsRing = 'miss' | 'single' | 'double' | 'triple' | 'outer_bull' | 'inner_bull';

export type CricketTarget = 15 | 16 | 17 | 18 | 19 | 20 | 'bull';

export interface ThrowDartsOptions {
  mode: ThrowDartsMode;
  matchType: ThrowDartsMatchType;
  difficulty: ThrowDartsDifficulty;
  sensitivity: ThrowDartsSensitivity;
  aimMode: ThrowDartsAimMode;
  timingMeter: boolean;
  assistLevel: ThrowDartsAssistLevel;
  reducedRandomness: boolean;
  doubleOut: boolean;
  haptics: boolean;
  sfx: boolean;
  handedness: ThrowDartsHandedness;
  showCheckout: boolean;
  showCoach: boolean;
  vfxLevel: ThrowDartsVfxLevel;
  dprCap: number;
  autoQuality: boolean;
}

export interface DartHit {
  ring: ThrowDartsRing;
  number: number | null;
  score: number;
  multiplier: 0 | 1 | 2 | 3;
  isDouble: boolean;
  isBull: boolean;
  radial: number;
  theta: number;
}

export interface SwipeThrowInput {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  durationMs: number;
  meterPhase: number;
}

export interface ThrowResolution {
  boardX: number;
  boardY: number;
  power: number;
  timingQuality: number;
}

export interface ThrowDartsPlayerStats {
  turns: number;
  totalScored: number;
  bulls: number;
}

export interface ThrowDartsX01PlayerState {
  remaining: number;
  turnStartRemaining: number;
  lastTurnTotal: number;
  turnAccumulated: number;
  lastTurnDarts: DartHit[];
  turnDarts: DartHit[];
  stats: ThrowDartsPlayerStats;
}

export interface ThrowDartsCricketPlayerState {
  marks: Record<CricketTarget, number>;
  points: number;
  lastTurnTotal: number;
  turnAccumulated: number;
  lastTurnDarts: DartHit[];
  turnDarts: DartHit[];
  stats: ThrowDartsPlayerStats;
}

export interface ThrowDartsPracticeState {
  throws: number;
  lastHit: DartHit | null;
  lastTurnDarts: DartHit[];
  stats: ThrowDartsPlayerStats;
}

export interface ThrowDartsX01State {
  kind: 'x01';
  startScore: 301 | 501;
  currentPlayer: 0 | 1;
  dartsRemaining: number;
  winner: 0 | 1 | null;
  players: [ThrowDartsX01PlayerState, ThrowDartsX01PlayerState];
}

export interface ThrowDartsCricketState {
  kind: 'cricket';
  currentPlayer: 0 | 1;
  dartsRemaining: number;
  winner: 0 | 1 | null;
  players: [ThrowDartsCricketPlayerState, ThrowDartsCricketPlayerState];
}

export interface ThrowDartsPracticeMatchState {
  kind: 'practice';
  dartsRemaining: number;
  state: ThrowDartsPracticeState;
}

export type ThrowDartsMatchState = ThrowDartsX01State | ThrowDartsCricketState | ThrowDartsPracticeMatchState;

export interface TargetPoint {
  x: number;
  y: number;
}

export interface AiThrowPlan {
  target: TargetPoint;
  meterPhase: number;
}
