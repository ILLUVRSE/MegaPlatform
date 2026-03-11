import { DEFAULT_CARD_TABLE_THEME_ID, getCardTableTheme, type CardTableTheme, type CardTableThemeId } from './themes';

export type CardFaceStyle = 'auto' | 'png' | 'svg';

export interface CardTableAppearanceSettings {
  themeId: CardTableThemeId;
  cardFaceStyle: CardFaceStyle;
  cardBackId: string;
  highContrastCards: boolean;
}

const APPEARANCE_KEY = 'gamegrid.cardtable.appearance.v1';
const THEME_TEXTURES = import.meta.glob('../../../assets/card-table/themes/*.png', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

function lookupThemeTexture(textureId: string): string | null {
  const file = `/${textureId}.png`;
  for (const [key, value] of Object.entries(THEME_TEXTURES)) {
    if (key.endsWith(file)) return value;
  }
  return null;
}

export const DEFAULT_CARD_TABLE_APPEARANCE: CardTableAppearanceSettings = {
  themeId: DEFAULT_CARD_TABLE_THEME_ID,
  cardFaceStyle: 'auto',
  cardBackId: getCardTableTheme(DEFAULT_CARD_TABLE_THEME_ID).cardBackId,
  highContrastCards: false
};

export function normalizeCardTableAppearance(
  incoming: Partial<CardTableAppearanceSettings> | undefined,
  fallbackThemeId?: string
): CardTableAppearanceSettings {
  const theme = getCardTableTheme(incoming?.themeId ?? fallbackThemeId ?? DEFAULT_CARD_TABLE_THEME_ID);
  const face = incoming?.cardFaceStyle;
  const style: CardFaceStyle = face === 'png' || face === 'svg' || face === 'auto' ? face : DEFAULT_CARD_TABLE_APPEARANCE.cardFaceStyle;
  return {
    themeId: theme.id,
    cardFaceStyle: style,
    cardBackId: incoming?.cardBackId?.trim() ? incoming.cardBackId : theme.cardBackId,
    highContrastCards: Boolean(incoming?.highContrastCards)
  };
}

export function saveCardTableAppearance(settings: CardTableAppearanceSettings): void {
  try {
    window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(settings));
  } catch {
    // no-op
  }
}

export function loadCardTableAppearance(): CardTableAppearanceSettings {
  try {
    const raw = window.localStorage.getItem(APPEARANCE_KEY);
    if (!raw) return DEFAULT_CARD_TABLE_APPEARANCE;
    const parsed = JSON.parse(raw) as Partial<CardTableAppearanceSettings>;
    return normalizeCardTableAppearance(parsed);
  } catch {
    return DEFAULT_CARD_TABLE_APPEARANCE;
  }
}

export function applyThemeCssVariables(container: HTMLElement, theme: CardTableTheme): void {
  const texture = lookupThemeTexture(theme.tableTextureId);
  container.style.setProperty('--ct-bg', theme.background);
  container.style.setProperty('--ct-panel', theme.panel);
  container.style.setProperty('--ct-accent', theme.accent);
  container.style.setProperty('--ct-text', theme.text);
  container.style.setProperty('--ct-muted', theme.muted);
  container.style.setProperty('--ct-card-back-id', theme.cardBackId);
  container.style.setProperty('--ct-theme-texture', texture ? `url(${texture})` : 'none');
  container.style.backgroundImage = texture ? `${theme.background}, url(${texture})` : theme.background;
  container.style.backgroundBlendMode = texture ? 'overlay, normal' : 'normal';
  container.style.backgroundRepeat = texture ? 'no-repeat, repeat' : 'no-repeat';
  container.style.backgroundSize = texture ? 'cover, 196px 196px' : 'cover';
}
