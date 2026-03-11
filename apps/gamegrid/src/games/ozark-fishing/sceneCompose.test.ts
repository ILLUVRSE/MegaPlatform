import { describe, expect, it } from 'vitest';
import { composeScene } from './sceneCompose';

describe('ozark scene composer', () => {
  it('is deterministic for identical seed and scene state', () => {
    const a = composeScene({
      sessionSeed: 8123,
      spotId: 'river-mouth',
      seasonId: 'fall',
      weather: 'overcast',
      timeOfDay: 'day',
      effectsQuality: 'high',
      environmentDetail: 'enhanced',
      reducedMotion: false,
      lowPerfFallback: false
    });
    const b = composeScene({
      sessionSeed: 8123,
      spotId: 'river-mouth',
      seasonId: 'fall',
      weather: 'overcast',
      timeOfDay: 'day',
      effectsQuality: 'high',
      environmentDetail: 'enhanced',
      reducedMotion: false,
      lowPerfFallback: false
    });

    expect(a).toEqual(b);
  });

  it('disables drift-heavy ambient effects with reduced motion', () => {
    const composition = composeScene({
      sessionSeed: 991,
      spotId: 'cove',
      seasonId: 'summer',
      weather: 'sunny',
      timeOfDay: 'night',
      effectsQuality: 'high',
      environmentDetail: 'enhanced',
      reducedMotion: true,
      lowPerfFallback: false
    });

    expect(composition.animateClouds).toBe(false);
    expect(composition.layers.ambient.fireflies).toBe(false);
    expect(composition.layers.ambient.mist).toBe(false);
  });

  it('bounds generated objects for mobile-first stability', () => {
    const composition = composeScene({
      sessionSeed: 42,
      spotId: 'open-water',
      seasonId: 'winter',
      weather: 'light_rain',
      timeOfDay: 'night',
      effectsQuality: 'high',
      environmentDetail: 'enhanced',
      reducedMotion: false,
      lowPerfFallback: false
    });

    expect(composition.objectCount).toBeLessThanOrEqual(composition.objectLimit);
    expect(composition.objectLimit).toBeLessThanOrEqual(220);
    expect(composition.layers.foreground.props.length).toBeLessThanOrEqual(18);
  });
});
