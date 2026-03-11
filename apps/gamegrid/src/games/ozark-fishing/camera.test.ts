import { describe, expect, it } from 'vitest';
import { OzarkCameraController, resolveCameraMode } from './camera';

describe('ozark camera controller', () => {
  it('forces camera off under reduced motion', () => {
    expect(resolveCameraMode('full', true)).toBe('off');
  });

  it('reuses frame output object to avoid per-frame allocations', () => {
    const controller = new OzarkCameraController();
    const a = controller.update({
      dt: 1 / 60,
      mode: 'subtle',
      reducedMotion: false,
      lowPerf: false,
      phase: 'idle',
      bobberX: 640,
      bobberY: 540,
      castAimOffset: 0,
      castProgress: 0,
      fishCueX: 640,
      fishCueY: 540
    });

    const b = controller.update({
      dt: 1 / 60,
      mode: 'subtle',
      reducedMotion: false,
      lowPerf: false,
      phase: 'cast',
      bobberX: 720,
      bobberY: 480,
      castAimOffset: 0.4,
      castProgress: 0.2,
      fishCueX: 640,
      fishCueY: 540
    });

    expect(a).toBe(b);
  });
});
