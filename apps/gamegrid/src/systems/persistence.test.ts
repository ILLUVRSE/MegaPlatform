import { describe, expect, it, vi } from 'vitest';
import { persistence } from './persistence';

describe('persistence fallback', () => {
  it('returns defaults when localStorage is unavailable', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('storage blocked');
      }
    });

    expect(persistence.loadSettings()).toMatchObject({ mute: false, debugHud: false });
    expect(() => persistence.saveSettings(persistence.loadSettings())).not.toThrow();

    if (original) {
      Object.defineProperty(window, 'localStorage', original);
    }
  });

  it('writes and reads settings when storage is available', () => {
    const setItem = vi.spyOn(window.localStorage.__proto__, 'setItem');
    const settings = persistence.loadSettings();
    persistence.saveSettings({ ...settings, mute: true });
    expect(setItem).toHaveBeenCalled();
  });
});
