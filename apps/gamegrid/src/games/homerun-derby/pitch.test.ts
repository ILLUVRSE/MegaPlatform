import { describe, expect, it } from 'vitest';
import { createPitchGenerator, nextPitch } from './pitching/pitch';
import { DEFAULT_TUNING } from './config/tuning';
import type { HomerunDifficulty, PitchType } from './types';

function collect(difficulty: HomerunDifficulty, count: number) {
  let state = createPitchGenerator(0x10203040);
  const types = new Set<PitchType>();
  let speedSum = 0;
  let breakSum = 0;

  for (let i = 0; i < count; i += 1) {
    const generated = nextPitch(state, difficulty, DEFAULT_TUNING);
    state = generated.state;
    types.add(generated.pitch.type);
    speedSum += generated.pitch.speedPxPerSec;
    breakSum += generated.pitch.breakPx;
  }

  return {
    types,
    averageSpeed: speedSum / count,
    averageBreak: breakSum / count
  };
}

describe('homerun pitch generation', () => {
  it('produces all pitch types', () => {
    const sample = collect('medium', 280);
    expect(sample.types.has('fastball')).toBe(true);
    expect(sample.types.has('curveball')).toBe(true);
    expect(sample.types.has('slider')).toBe(true);
    expect(sample.types.has('changeup')).toBe(true);
    expect(sample.types.has('splitter')).toBe(true);
  });

  it('difficulty scaling changes speed and break characteristics', () => {
    const easy = collect('easy', 160);
    const hard = collect('hard', 160);

    expect(hard.averageSpeed).toBeGreaterThan(easy.averageSpeed);
    expect(hard.averageBreak).toBeGreaterThan(easy.averageBreak);
  });
});
