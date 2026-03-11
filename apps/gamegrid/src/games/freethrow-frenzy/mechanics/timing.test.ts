import { describe, expect, it } from 'vitest';
import { classifyTiming, computeTimingWindow } from './timing';
import { TIMING_TUNING } from '../config/tuning';

describe('freethrow timing', () => {
  it('classifies perfect releases near center', () => {
    const window = computeTimingWindow(TIMING_TUNING, 1, 0);
    const result = classifyTiming(0.5, window);
    expect(result.bucket).toBe('perfect');
    expect(result.quality).toBeGreaterThan(0.95);
  });

  it('classifies early and late releases', () => {
    const window = computeTimingWindow(TIMING_TUNING, 1, 0);
    const early = classifyTiming(0.2, window);
    const late = classifyTiming(0.85, window);
    expect(early.bucket).toBe('early');
    expect(late.bucket).toBe('late');
  });
});
