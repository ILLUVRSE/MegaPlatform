export type GameStatus = 'coming_soon' | 'live';

export type InputType = 'touch' | 'mouse' | 'keyboard' | 'hybrid';
export type ThemeMode = 'system' | 'light' | 'dark';
export type ThemeSkin =
  | 'classic-green-felt'
  | 'neon-arcade'
  | 'midnight'
  | 'sunset'
  | 'minimal-light'
  | 'carbon';

export interface GameDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  inputType: InputType;
  status: GameStatus;
  route: string;
  loadModule: () => Promise<{
    createSceneLabel?: () => string;
    createGame?: (target: HTMLDivElement, hooks: import('./game/modules').GameRuntimeHooks) => import('./game/engine').GameEngine;
  }>;
}

export interface PortalSettings {
  mute: boolean;
  musicMuted: boolean;
  sfxMuted: boolean;
  reducedMotion: boolean;
  largeUi: boolean;
  haptics: boolean;
  debugHud: boolean;
  highContrast: boolean;
  colorblindSafe: boolean;
  themeMode: ThemeMode;
  themeSkin: ThemeSkin;
  perfDiagnostics: boolean;
}

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface GameStats {
  plays: number;
  bestScore: number;
  lastScore: number;
  wins: number;
}

export interface PortalCurrency {
  tickets: number;
  tokens: number;
}

export type DailyQuestKind = 'play_matches' | 'win_matches' | 'score_points' | 'play_variety' | 'party_match';

export interface DailyQuestProgress {
  id: string;
  name: string;
  description: string;
  kind: DailyQuestKind;
  target: number;
  progress: number;
  rewardTickets: number;
  completed: boolean;
  gameId?: string | null;
  uniqueGameIds?: string[];
}

export interface DailyQuestState {
  dateKey: string;
  quests: DailyQuestProgress[];
}

export interface InventoryState {
  owned: string[];
  equipped: string | null;
}

export type RankTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'grandmaster';

export interface RankRecord {
  rating: number;
  tier: RankTier;
  matches: number;
  wins: number;
  losses: number;
  peakTier: RankTier;
}

export interface RankState {
  seasonId: string;
  perGame: Record<string, RankRecord>;
  meta: RankRecord;
}

export interface BattlePassState {
  seasonId: string;
  tier: number;
  xp: number;
  premiumUnlocked: boolean;
}

export interface DailyRewardState {
  dateKey: string | null;
  streakDay: number;
  lastClaimedOn: string | null;
}

export interface PortalStats {
  lastPlayed: string | null;
  perGame: Record<string, GameStats>;
  totalPlays: number;
  totalScore: number;
  totalWins: number;
  xp: number;
  level: number;
  unlockedTitles: string[];
  dailyStreak: number;
  longestStreak: number;
  lastPlayedOn: string | null;
  currency: PortalCurrency;
  dailyQuests: DailyQuestState;
  inventory: InventoryState;
  rank: RankState;
  battlePass: BattlePassState;
  dailyReward: DailyRewardState;
}
