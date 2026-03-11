export type HomerunMode = 'classic_10' | 'timed_60' | 'duel_10';

export type HomerunDifficulty = 'easy' | 'medium' | 'hard' | 'pro';

export type PitchType = 'fastball' | 'curveball' | 'slider' | 'changeup' | 'splitter';

export type AimLane = -1 | 0 | 1;

export type BatterRole = 'player' | 'ai';

export interface HomerunOptions {
  mode: HomerunMode;
  difficulty: HomerunDifficulty;
  timingAssist: boolean;
  aimAssist: boolean;
  pitchTells: boolean;
}

export interface PitchTell {
  label: string;
  color: number;
}

export interface PitchDefinition {
  id: number;
  type: PitchType;
  speedPxPerSec: number;
  breakPx: number;
  verticalBreak: number;
  verticalPlane: number;
  windupMs: number;
  travelMs: number;
  intervalMs: number;
  tell: PitchTell;
}

export interface PitchGeneratorState {
  seed: number;
  index: number;
}

export interface TimingWindows {
  perfectMs: number;
  earlyLateMs: number;
}

export type TimingTier = 'perfect' | 'early' | 'late' | 'miss';

export type ContactQuality = 'miss' | 'weak' | 'solid' | 'perfect';
export type ContactGrade = 'Perfect' | 'Good' | 'Early' | 'Late' | 'Foul' | 'Miss';

export interface ContactResult {
  timing: TimingTier;
  quality: ContactQuality;
  grade: ContactGrade;
  exitVelocityMph: number;
  launchAngleDeg: number;
  sprayLane: AimLane;
  sprayAngleDeg?: number;
  perfectPerfect: boolean;
  strike: boolean;
  aimError: number;
  timingDeltaMs: number;
}

export type AtBatResult = 'home_run' | 'foul' | 'fly_out' | 'ground_out' | 'line_out' | 'strike';

export interface FlightResult {
  result: AtBatResult;
  distanceFt: number;
  hangTimeMs: number;
  landingX: number;
  peakY: number;
  isHomeRun: boolean;
  sprayAngleDeg: number;
}

export interface BatterSwing {
  contact: ContactResult;
  flight: FlightResult;
}

export interface MatchStats {
  score: number;
  hrCount: number;
  bestDistance: number;
  perfectCount: number;
  strikeouts: number;
  streak: number;
  multiplier: number;
}

export interface ClassicState {
  kind: 'classic_10';
  pitchesThrown: number;
  pitchesRemaining: number;
  ended: boolean;
}

export interface TimedState {
  kind: 'timed_60';
  timeRemainingMs: number;
  ended: boolean;
}

export interface DuelState {
  kind: 'duel_10';
  phase: BatterRole;
  playerPitchesThrown: number;
  aiPitchesThrown: number;
  playerScore: number;
  aiScore: number;
  ended: boolean;
}

export type MatchModeState = ClassicState | TimedState | DuelState;

export interface MatchState {
  mode: HomerunMode;
  state: MatchModeState;
  stats: MatchStats;
}

export interface OutcomeContext {
  role: BatterRole;
  swing: BatterSwing;
}

export interface MatchEndSummary {
  mode: HomerunMode;
  score: number;
  hrCount: number;
  bestDistance: number;
  perfectCount: number;
  durationMs: number;
  winner: 'player' | 'ai' | 'tie' | null;
}

export interface AIDifficultyProfile {
  timingJitterMs: number;
  missChance: number;
  laneMistakeChance: number;
  powerBias: number;
}
