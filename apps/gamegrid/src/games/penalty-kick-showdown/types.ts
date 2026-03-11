export type PenaltyMode = 'classic_5' | 'sudden_death' | 'pressure_ladder' | 'practice';
export type PenaltyDifficulty = 'easy' | 'medium' | 'hard';
export type PenaltyControls = 'swipe' | 'tap_target';
export type PenaltySensitivity = 'low' | 'medium' | 'high';

export interface PenaltyOptions {
  spinEnabled: boolean;
  assistEnabled: boolean;
  sensitivity: PenaltySensitivity;
}

export interface PenaltySetup {
  mode: PenaltyMode;
  difficulty: PenaltyDifficulty;
  controls: PenaltyControls;
  options: PenaltyOptions;
}

export interface GoalRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  crossbarY: number;
}

export interface ZoneStats {
  attempts: number;
  goals: number;
}

export interface PenaltyStats {
  goals: number;
  savesAgainst: number;
  missesWide: number;
  missesHigh: number;
  postHits: number;
  streak: number;
  bestStreak: number;
  totalShots: number;
  zone: {
    left: ZoneStats;
    center: ZoneStats;
    right: ZoneStats;
  };
}

export interface PenaltyScoreSummary {
  score: number;
  stats: PenaltyStats;
}

export interface MatchState {
  mode: PenaltyMode;
  round: number;
  shotsTaken: number;
  shotsRemaining: number;
  ended: boolean;
  score: number;
  streak: number;
  bestStreak: number;
  effectiveDifficulty: PenaltyDifficulty;
  stats: PenaltyStats;
}

export type ShotControlSource = 'swipe' | 'tap_target';

export interface ShotInput {
  source: ShotControlSource;
  targetXNorm: number;
  targetYNorm: number;
  power: number;
  spin: number;
  curvatureHint: number;
  pressure: number;
}

export interface ShotModelContext {
  goal: GoalRect;
  difficulty: PenaltyDifficulty;
  assistEnabled: boolean;
  sensitivity: PenaltySensitivity;
  spinEnabled: boolean;
}

export interface ShotPlan {
  aimX: number;
  aimY: number;
  power: number;
  spin: number;
  curve: number;
  varianceX: number;
  varianceY: number;
  perfectWindow: boolean;
  cornerTarget: boolean;
  finalX: number;
  finalY: number;
  quality: number;
}

export type ShotResultKind = 'goal' | 'wide' | 'high' | 'saved' | 'post';

export interface ShotResolution {
  result: ShotResultKind;
  finalX: number;
  finalY: number;
  keeperSaved: boolean;
  cornerGoal: boolean;
  perfectShot: boolean;
  pointsAwarded: number;
  zone: 'left' | 'center' | 'right';
}

export interface GoalieDecisionContext {
  difficulty: PenaltyDifficulty;
  readAimX: number;
  readAimY: number;
  shotPower: number;
  reactionJitter: number;
  randomness: number;
}

export interface GoalieDivePlan {
  targetX: number;
  reactionDelayMs: number;
  diveDurationMs: number;
  reachPx: number;
}

export interface GoalieSaveContext {
  shotX: number;
  shotY: number;
  goal: GoalRect;
  plan: GoalieDivePlan;
  keeperXAtIntercept: number;
}

export interface ScoringConfig {
  goalBase: number;
  cornerBonus: number;
  perfectBonus: number;
  ladderRoundBonusStep: number;
}

export const DEFAULT_SCORING: ScoringConfig = {
  goalBase: 100,
  cornerBonus: 40,
  perfectBonus: 30,
  ladderRoundBonusStep: 12
};
