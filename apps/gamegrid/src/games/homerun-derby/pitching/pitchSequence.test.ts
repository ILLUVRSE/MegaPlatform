import { describe, expect, it } from 'vitest';
import { createPitchGenerator, nextPitch } from './pitch';
import { DEFAULT_TUNING } from '../config/tuning';

function sampleSequence(seed: number, count: number) {
  let state = createPitchGenerator(seed);
  const output: Array<{ type: string; speed: number; breakPx: number; vertical: number }> = [];
  for (let i = 0; i < count; i += 1) {
    const next = nextPitch(state, 'medium', DEFAULT_TUNING);
    state = next.state;
    output.push({
      type: next.pitch.type,
      speed: Math.round(next.pitch.speedPxPerSec),
      breakPx: Math.round(next.pitch.breakPx),
      vertical: Math.round(next.pitch.verticalBreak)
    });
  }
  return output;
}

describe('homerun pitch determinism', () => {
  it('produces the same sequence with the same seed', () => {
    const a = sampleSequence(0x10203040, 6);
    const b = sampleSequence(0x10203040, 6);
    expect(a).toEqual(b);
  });

  it('produces a different sequence with a different seed', () => {
    const a = sampleSequence(0x10203040, 6);
    const b = sampleSequence(0x99887766, 6);
    expect(a).not.toEqual(b);
  });
});
