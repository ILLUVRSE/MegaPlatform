export type CardTableModeId =
  | 'blackjack'
  | 'higher-lower'
  | 'thirtyone'
  | 'solitaire'
  | 'forehead-poker'
  | 'five-card-draw'
  | 'holdem';

export interface CardTableSettings {
  speed: 'normal' | 'fast';
  hints: boolean;
  higherLowerEqualPolicy: 'lose' | 'push';
  solitaireDraw: 'draw1' | 'draw3';
  solitaireAutoFoundation: boolean;
  sharedBankroll: boolean;
  appearanceTheme: 'classic-green' | 'midnight-blue' | 'crimson-casino' | 'neon-arcade' | 'minimal-light';
  cardFaceStyle: 'auto' | 'png' | 'svg';
  cardBackId: 'back-classic' | 'back-midnight' | 'back-crimson';
  highContrastCards: boolean;
}

export interface ModeStats {
  plays: number;
  wins: number;
  losses: number;
  pushes: number;
  bestStreak: number;
  bankrollDelta: number;
}

export interface CardTableProfile {
  bankroll: number;
  perMode: Record<CardTableModeId, ModeStats>;
  settings: CardTableSettings;
}

const KEY = 'gamegrid.cardtable.v1';
const DEFAULT_BANKROLL = 1000;

const defaultStats = (): ModeStats => ({
  plays: 0,
  wins: 0,
  losses: 0,
  pushes: 0,
  bestStreak: 0,
  bankrollDelta: 0
});

export const DEFAULT_PROFILE: CardTableProfile = {
  bankroll: DEFAULT_BANKROLL,
  settings: {
    speed: 'normal',
    hints: true,
    higherLowerEqualPolicy: 'lose',
    solitaireDraw: 'draw1',
    solitaireAutoFoundation: true,
    sharedBankroll: true,
    appearanceTheme: 'classic-green',
    cardFaceStyle: 'auto',
    cardBackId: 'back-classic',
    highContrastCards: false
  },
  perMode: {
    blackjack: defaultStats(),
    'higher-lower': defaultStats(),
    thirtyone: defaultStats(),
    solitaire: defaultStats(),
    'forehead-poker': defaultStats(),
    'five-card-draw': defaultStats(),
    holdem: defaultStats()
  }
};

export function loadCardTableProfile(): CardTableProfile {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<CardTableProfile>;
    const perMode = (parsed.perMode ?? {}) as Partial<Record<CardTableModeId, Partial<ModeStats>>>;
    return {
      bankroll: typeof parsed.bankroll === 'number' ? parsed.bankroll : DEFAULT_BANKROLL,
      settings: {
        ...DEFAULT_PROFILE.settings,
        ...(parsed.settings ?? {})
      },
      perMode: {
        blackjack: { ...defaultStats(), ...perMode.blackjack },
        'higher-lower': { ...defaultStats(), ...perMode['higher-lower'] },
        thirtyone: { ...defaultStats(), ...perMode.thirtyone },
        solitaire: { ...defaultStats(), ...perMode.solitaire },
        'forehead-poker': { ...defaultStats(), ...perMode['forehead-poker'] },
        'five-card-draw': { ...defaultStats(), ...perMode['five-card-draw'] },
        holdem: { ...defaultStats(), ...perMode.holdem }
      }
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveCardTableProfile(profile: CardTableProfile): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // no-op
  }
}

export function applyRoundOutcome(
  profile: CardTableProfile,
  mode: CardTableModeId,
  outcome: 'win' | 'loss' | 'push',
  bankrollDelta: number,
  streak: number
): CardTableProfile {
  const stats = profile.perMode[mode];
  const nextStats: ModeStats = {
    ...stats,
    plays: stats.plays + 1,
    wins: stats.wins + (outcome === 'win' ? 1 : 0),
    losses: stats.losses + (outcome === 'loss' ? 1 : 0),
    pushes: stats.pushes + (outcome === 'push' ? 1 : 0),
    bestStreak: Math.max(stats.bestStreak, streak),
    bankrollDelta: stats.bankrollDelta + bankrollDelta
  };

  return {
    ...profile,
    bankroll: Math.max(0, profile.bankroll + bankrollDelta),
    perMode: {
      ...profile.perMode,
      [mode]: nextStats
    }
  };
}
