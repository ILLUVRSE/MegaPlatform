export type CardTableThemeId = 'classic-green' | 'midnight-blue' | 'crimson-casino' | 'neon-arcade' | 'minimal-light';

export interface CardTableTheme {
  id: CardTableThemeId;
  name: string;
  tableTextureId: string;
  background: string;
  panel: string;
  accent: string;
  text: string;
  muted: string;
  cardBackId: string;
  reducedMotionPrefersStatic: boolean;
  soundPack: string | null;
}

export const CARD_TABLE_THEMES: readonly CardTableTheme[] = [
  {
    id: 'classic-green',
    name: 'Classic Green Felt',
    tableTextureId: 'felt-classic',
    background: 'radial-gradient(circle at 20% 20%, #1f7a4f, #0b3d2a 70%)',
    panel: '#0f2f25',
    accent: '#fbbf24',
    text: '#f8fafc',
    muted: '#bbf7d0',
    cardBackId: 'back-classic',
    reducedMotionPrefersStatic: true,
    soundPack: null
  },
  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    tableTextureId: 'felt-midnight',
    background: 'radial-gradient(circle at 30% 10%, #1e3a8a, #0b1022 72%)',
    panel: '#0f1b3a',
    accent: '#38bdf8',
    text: '#f1f5f9',
    muted: '#bfdbfe',
    cardBackId: 'back-midnight',
    reducedMotionPrefersStatic: true,
    soundPack: null
  },
  {
    id: 'crimson-casino',
    name: 'Crimson Casino',
    tableTextureId: 'felt-crimson',
    background: 'radial-gradient(circle at 60% 0%, #be123c, #450a0a 74%)',
    panel: '#58111e',
    accent: '#f59e0b',
    text: '#fff7ed',
    muted: '#fecdd3',
    cardBackId: 'back-crimson',
    reducedMotionPrefersStatic: true,
    soundPack: null
  },
  {
    id: 'neon-arcade',
    name: 'Neon Arcade',
    tableTextureId: 'felt-neon',
    background: 'linear-gradient(145deg, #042f2e, #0f172a 52%, #1d4ed8)',
    panel: '#082f49',
    accent: '#22d3ee',
    text: '#ecfeff',
    muted: '#a5f3fc',
    cardBackId: 'back-midnight',
    reducedMotionPrefersStatic: false,
    soundPack: 'arcade-synth'
  },
  {
    id: 'minimal-light',
    name: 'Minimal Light',
    tableTextureId: 'felt-light',
    background: 'linear-gradient(180deg, #f8fafc, #e2e8f0)',
    panel: '#e2e8f0',
    accent: '#0ea5e9',
    text: '#0f172a',
    muted: '#334155',
    cardBackId: 'back-classic',
    reducedMotionPrefersStatic: true,
    soundPack: null
  }
] as const;

export const DEFAULT_CARD_TABLE_THEME_ID: CardTableThemeId = 'classic-green';

const THEMES_BY_ID = new Map<CardTableThemeId, CardTableTheme>(CARD_TABLE_THEMES.map((theme) => [theme.id, theme]));

export function getCardTableTheme(themeId: string | null | undefined): CardTableTheme {
  if (!themeId) return THEMES_BY_ID.get(DEFAULT_CARD_TABLE_THEME_ID) as CardTableTheme;
  return THEMES_BY_ID.get(themeId as CardTableThemeId) ?? (THEMES_BY_ID.get(DEFAULT_CARD_TABLE_THEME_ID) as CardTableTheme);
}
