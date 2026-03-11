import { beforeEach, describe, expect, it } from 'vitest';
import { defaultVisualSettings, loadVisualSettings, saveVisualSettings } from './settings';

describe('oz chronicle visual settings persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('round-trips persisted settings', () => {
    const settings = {
      ...defaultVisualSettings(false),
      skin: 'night-ink' as const,
      effectsQuality: 'med' as const,
      particleDensity: 'low' as const,
      backgroundDetail: 'basic' as const,
      reducedMotion: true
    };
    saveVisualSettings(settings);

    const loaded = loadVisualSettings(false);
    expect(loaded.skin).toBe('night-ink');
    expect(loaded.effectsQuality).toBe('med');
    expect(loaded.particleDensity).toBe('low');
    expect(loaded.backgroundDetail).toBe('basic');
    expect(loaded.reducedMotion).toBe(true);
  });
});
