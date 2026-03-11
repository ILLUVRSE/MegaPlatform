import { useMemo } from 'react';
import { getCardTableTheme, type CardTableTheme } from './themes';
import { normalizeCardTableAppearance, type CardTableAppearanceSettings } from './themeManager';

export function useCardTableTheme(
  incoming: Partial<CardTableAppearanceSettings> | undefined
): { appearance: CardTableAppearanceSettings; theme: CardTableTheme } {
  const appearance = useMemo(() => normalizeCardTableAppearance(incoming), [incoming]);
  const theme = useMemo(() => getCardTableTheme(appearance.themeId), [appearance.themeId]);
  return { appearance, theme };
}
