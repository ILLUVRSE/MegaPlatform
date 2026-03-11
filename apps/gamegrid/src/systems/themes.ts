import type { ThemeMode, ThemeSkin } from '../types';

export const THEME_SKINS: ReadonlyArray<{ id: ThemeSkin; label: string; blurb: string }> = [
  { id: 'classic-green-felt', label: 'Classic Green Felt', blurb: 'Sport lounge green with felt texture.' },
  { id: 'neon-arcade', label: 'Neon Arcade', blurb: 'Electric cyan and pink arcade glow.' },
  { id: 'midnight', label: 'Midnight', blurb: 'Deep navy panels with calm contrast.' },
  { id: 'sunset', label: 'Sunset', blurb: 'Warm amber tones and dusk gradients.' },
  { id: 'minimal-light', label: 'Minimal Light', blurb: 'Crisp light UI with restrained accents.' },
  { id: 'carbon', label: 'Carbon', blurb: 'Industrial graphite with sharp highlights.' }
];

export function resolveThemeMode(mode: ThemeMode, prefersDark: boolean): 'light' | 'dark' {
  if (mode === 'system') return prefersDark ? 'dark' : 'light';
  return mode;
}

