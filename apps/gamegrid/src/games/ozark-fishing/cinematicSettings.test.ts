import { describe, expect, it } from 'vitest';
import {
  cycleCinematicCameraMode,
  defaultCinematicSettings,
  loadCinematicSettings,
  resolveCinematicRuntime,
  saveCinematicSettings
} from './cinematicSettings';

describe('ozark cinematic settings', () => {
  it('persists cinematic configuration', () => {
    const base = defaultCinematicSettings();
    const next = {
      ...base,
      cameraMode: 'full' as const,
      cinematicSlowMo: false,
      musicVolume: 0.4,
      sfxVolume: 0.66,
      dynamicMix: false
    };
    saveCinematicSettings(next);
    expect(loadCinematicSettings()).toEqual(next);
  });

  it('forces camera and slow-mo off with reduced motion runtime', () => {
    const runtime = resolveCinematicRuntime(defaultCinematicSettings(), true, false);
    expect(runtime.cameraMode).toBe('off');
    expect(runtime.slowMoEnabled).toBe(false);
  });

  it('cycles camera mode deterministically', () => {
    expect(cycleCinematicCameraMode('off')).toBe('subtle');
    expect(cycleCinematicCameraMode('subtle')).toBe('full');
    expect(cycleCinematicCameraMode('full')).toBe('off');
  });
});
