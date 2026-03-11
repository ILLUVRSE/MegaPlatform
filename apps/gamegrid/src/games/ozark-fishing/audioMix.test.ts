import { describe, expect, it } from 'vitest';
import { OzarkAudioMixController, computeDuckGain } from './audioMix';

describe('ozark audio mix', () => {
  it('ducking math stays bounded and deterministic', () => {
    expect(computeDuckGain(1, 0.2)).toBeCloseTo(0.8, 6);
    expect(computeDuckGain(0.6, 0.5)).toBeCloseTo(0.3, 6);
    expect(computeDuckGain(1, 2)).toBe(0);
  });

  it('dynamic mix toggles do not throw without audio context', () => {
    const mix = new OzarkAudioMixController();
    mix.init(null);
    expect(() => {
      mix.update(1 / 60, {
        muted: false,
        musicVolume: 0.5,
        sfxVolume: 0.7,
        dynamicMix: true,
        tension: 0.8,
        inFight: true
      });
      mix.update(1 / 60, {
        muted: false,
        musicVolume: 0.5,
        sfxVolume: 0.7,
        dynamicMix: false,
        tension: 0.8,
        inFight: true
      });
      mix.noteBiteCue();
      mix.noteHookSet();
      mix.noteCatch();
      mix.dispose();
    }).not.toThrow();
  });
});
