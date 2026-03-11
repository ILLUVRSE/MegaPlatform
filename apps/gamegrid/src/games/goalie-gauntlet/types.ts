export const GOALIE_ZONES = [
  'high-left',
  'mid-left',
  'low-left',
  'high-right',
  'mid-right',
  'low-right'
] as const;

export type GoalieZone = (typeof GOALIE_ZONES)[number];
export type GoalieMode = 'survival' | 'time_attack' | 'challenge' | 'ranked' | 'career';
export type GoalieDifficulty = 'easy' | 'medium' | 'hard';
export type GoalieControls = 'drag' | 'tap_dive';
export type GoalieSensitivity = 'low' | 'medium' | 'high';
export type ShotType = 'straight' | 'curve' | 'one_timer';
export type TelegraphType = 'windup' | 'glow' | 'both';
export type SaveGrade = 'PERFECT' | 'GOOD' | 'LATE' | 'MISS';
export type SaveActionType = 'standard' | 'poke_check' | 'glove_snag' | 'desperation_dive';

export interface GoalieOptions {
  assistLaneIndicator: boolean;
  warmup: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  lowQuality: boolean;
  preLaneIndicator: boolean;
}

export interface GoalieSetup {
  mode: GoalieMode;
  difficulty: GoalieDifficulty;
  controls: GoalieControls;
  sensitivity: GoalieSensitivity;
  options: GoalieOptions;
}

export interface ShotPatternEntry {
  zone: GoalieZone;
  telegraph: TelegraphType;
  speed: number;
  realZone?: GoalieZone;
  type?: ShotType;
  fake?: boolean;
  fakeShiftAtMs?: number;
  deflection?: boolean;
  spin?: boolean;
  rebound?: boolean;
  reboundSpeedMultiplier?: number;
  comboGapMs?: number;
}

export interface ShotPatternDefinition {
  id: string;
  name: string;
  description: string;
  tags: string[];
  shots: ShotPatternEntry[];
}

export interface ShotPatternCatalog {
  patterns: ShotPatternDefinition[];
}

export interface ScheduledShot {
  id: number;
  patternId: string;
  sequenceIndex: number;
  roundIndex: number;
  zone: GoalieZone;
  telegraphZone: GoalieZone;
  realZone: GoalieZone;
  telegraph: TelegraphType;
  type: ShotType;
  speed: number;
  fake: boolean;
  fakeShiftAtMs: number | null;
  deflection: boolean;
  spin: boolean;
  rebound: boolean;
  reboundSpeedMultiplier: number;
  reboundParentShotId: number | null;
  scoreMultiplier: number;
  telegraphAtMs: number;
  spawnAtMs: number;
  arriveAtMs: number;
}

export interface TimingWindows {
  perfectEarlyMinMs: number;
  perfectEarlyMaxMs: number;
  goodMinMs: number;
  goodMaxMs: number;
  lateMaxMs: number;
}

export interface GoalieInputState {
  zone: GoalieZone;
  changedAtMs: number;
  gestureType: 'drag' | 'tap_dive';
  actionType?: SaveActionType;
  coveredZones?: readonly GoalieZone[];
  holdDurationMs?: number;
}

export interface ShotResolution {
  shotId: number;
  zone: GoalieZone;
  grade: SaveGrade;
  actionType: SaveActionType;
  deltaMs: number;
  points: number;
  multiplier: number;
  streakAfter: number;
  lifeLost: boolean;
  streakProtectionApplied: boolean;
}

export interface MatchStats {
  shotsFaced: number;
  saves: number;
  misses: number;
  perfectSaves: number;
  goodSaves: number;
  lateSaves: number;
  pokeChecks: number;
  gloveSnags: number;
  desperationDives: number;
  reboundsFaced: number;
  reboundsSaved: number;
  streakProtectionsUsed: number;
  streak: number;
  bestStreak: number;
}

export interface MatchState {
  mode: GoalieMode;
  difficulty: GoalieDifficulty;
  score: number;
  lives: number;
  elapsedMs: number;
  ended: boolean;
  streakMultiplier: number;
  streakProtectionCharges: number;
  stats: MatchStats;
}

export interface ChallengeDefinition {
  id: string;
  name: string;
  description: string;
  patternId: string;
  difficulty: GoalieDifficulty;
  shotCount: number;
  win: {
    minSaves?: number;
    maxMisses?: number;
    minPerfect?: number;
    minPerfectStreak?: number;
    maxLate?: number;
    maxTimeMs?: number;
  };
}

export interface ChallengeCatalog {
  challenges: ChallengeDefinition[];
}

export interface ChallengeProgress {
  completed: Record<string, boolean>;
}

export interface GoaliePersistentStats {
  bestStreak: number;
  totalSaves: number;
  perfectSaves: number;
  bestScoreByMode: Record<GoalieMode, number>;
  lastRankedScore: number;
  bestRankedScore: number;
  rankedTier: 'Bronze' | 'Silver' | 'Gold' | 'Elite' | 'Legendary';
  challengeCompletion: Record<string, boolean>;
  unlockedMaskColors: string[];
  selectedMaskColor: string;
}

export interface GoalieStoredSettings {
  mode: GoalieMode;
  difficulty: GoalieDifficulty;
  controls: GoalieControls;
  sensitivity: GoalieSensitivity;
  assistLaneIndicator: boolean;
  warmup: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  lowQuality: boolean;
  preLaneIndicator: boolean;
}

export interface ScoreConfig {
  perfect: number;
  good: number;
  late: number;
  streakStep: number;
  streakCap: number;
  multiplierCap: number;
}

export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  perfect: 160,
  good: 100,
  late: 60,
  streakStep: 0.1,
  streakCap: 12,
  multiplierCap: 2.5
};

// Legacy types kept for physics test utilities.
export interface DifficultyProfile {
  speedMin: number;
  speedMax: number;
  curveChance: number;
  oneTimerChance: number;
  spawnMsMin: number;
  spawnMsMax: number;
}

export interface ShotSpawn {
  lane: -1 | 0 | 1;
  speed: number;
  type: ShotType;
  delayMs: number;
}

export interface ShotRuntime extends ShotSpawn {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  curveAccel: number;
  active: boolean;
  spawnedAtMs: number;
}

export interface GoalieBody {
  x: number;
  y: number;
  width: number;
  height: number;
  gloveBias: boolean;
}

export interface SaveResult {
  saved: boolean;
  deflected: boolean;
  perfect: boolean;
  reactionMs: number;
  side: 'glove' | 'stick' | 'center';
}
