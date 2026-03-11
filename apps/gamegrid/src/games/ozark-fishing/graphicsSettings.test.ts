import { describe, expect, it } from 'vitest';
import {
  buildGraphicsRuntime,
  cycleEnvironmentDetail,
  cycleEffectsQuality,
  cycleParticleDensity,
  cycleWaterDetail,
  defaultGraphicsSettings,
  loadGraphicsSettings,
  saveGraphicsSettings,
  shouldApplyCameraShake
} from './graphicsSettings';

describe('ozark graphics settings', () => {
  it('builds visual runtime and persists non-gameplay-only knobs', () => {
    const settings = {
      ...defaultGraphicsSettings(),
      effectsQuality: 'low' as const,
      waterDetail: 'basic' as const,
      particleDensity: 'low' as const,
      environmentDetail: 'basic' as const,
      reducedMotion: true,
      legendaryAura: false
    };
    const runtime = buildGraphicsRuntime(settings, false, false);

    expect(runtime.waveLayers).toBeGreaterThanOrEqual(0);
    expect(runtime.enableCameraShake).toBe(false);
    expect(runtime.enableLegendaryAura).toBe(false);
    // Visual runtime should not contain gameplay-related keys.
    expect('snapThresholdMultiplier' in (runtime as unknown as Record<string, unknown>)).toBe(false);
    expect('hookForgiveness' in (runtime as unknown as Record<string, unknown>)).toBe(false);
  });

  it('reduced motion disables shake and quality cycles are deterministic', () => {
    const settings = defaultGraphicsSettings();
    settings.reducedMotion = true;
    expect(shouldApplyCameraShake(settings, false)).toBe(false);

    expect(cycleEffectsQuality('low')).toBe('medium');
    expect(cycleEffectsQuality('medium')).toBe('high');
    expect(cycleEffectsQuality('high')).toBe('low');

    expect(cycleWaterDetail('off')).toBe('basic');
    expect(cycleWaterDetail('basic')).toBe('enhanced');
    expect(cycleWaterDetail('enhanced')).toBe('off');

    expect(cycleParticleDensity('low')).toBe('normal');
    expect(cycleParticleDensity('normal')).toBe('low');

    expect(cycleEnvironmentDetail('off')).toBe('basic');
    expect(cycleEnvironmentDetail('basic')).toBe('enhanced');
    expect(cycleEnvironmentDetail('enhanced')).toBe('off');
  });

  it('persists and reloads graphics settings', () => {
    const original = defaultGraphicsSettings();
    const next = {
      ...original,
      effectsQuality: 'medium' as const,
      waterDetail: 'basic' as const,
      particleDensity: 'low' as const,
      environmentDetail: 'enhanced' as const,
      reducedMotion: true,
      legendaryAura: false,
      showFpsCounter: true
    };
    saveGraphicsSettings(next);
    const loaded = loadGraphicsSettings();
    expect(loaded).toEqual(next);
  });
});
