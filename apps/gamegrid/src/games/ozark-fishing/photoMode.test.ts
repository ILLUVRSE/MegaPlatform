import { describe, expect, it } from 'vitest';
import { applyPhotoFilterRgba, createDefaultPhotoModeState, exportPhotoModePng, isPngBlobLike } from './photoMode';

describe('ozark photo mode', () => {
  it('applies filter pipeline and preserves buffer size', () => {
    const input = new Uint8ClampedArray([100, 120, 140, 255, 20, 30, 40, 255]);
    const warm = applyPhotoFilterRgba(input, 'warm_sunset');
    const bw = applyPhotoFilterRgba(input, 'black_white');

    expect(warm.length).toBe(input.length);
    expect(bw.length).toBe(input.length);
    expect(warm[0]).not.toBe(input[0]);
    expect(bw[0]).toBe(bw[1]);
    expect(bw[1]).toBe(bw[2]);
  });

  it('exports png-like blob and does not mutate game state model', async () => {
    const state = createDefaultPhotoModeState();
    const blob = await exportPhotoModePng({ width: 1200, height: 1200, filter: 'cool_morning' });
    const isPng = await isPngBlobLike(blob);

    expect(blob.type).toBe('image/png');
    expect(isPng).toBe(true);
    expect(state.active).toBe(false);
    expect(state.zoom).toBe(1);
  });
});
