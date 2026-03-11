import { describe, expect, it } from 'vitest';
import { persistence } from './persistence';

describe('theme persistence', () => {
  it('persists mode and skin selections', () => {
    const initial = persistence.loadSettings();
    persistence.saveSettings({ ...initial, themeMode: 'dark', themeSkin: 'neon-arcade' });

    const loaded = persistence.loadSettings();
    expect(loaded.themeMode).toBe('dark');
    expect(loaded.themeSkin).toBe('neon-arcade');
  });
});
