import { describe, expect, it } from 'vitest';
import { getTimingWindows, resolveTimingTier } from './physics/contact';
import { DEFAULT_TUNING } from './config/tuning';

describe('homerun batting timing windows', () => {
  it('produces expected contact timing tiers', () => {
    const windows = getTimingWindows('medium', false, DEFAULT_TUNING);

    expect(resolveTimingTier(0, windows)).toBe('perfect');
    expect(resolveTimingTier(-(windows.perfectMs + 4), windows)).toBe('early');
    expect(resolveTimingTier(windows.perfectMs + 4, windows)).toBe('late');
    expect(resolveTimingTier(windows.earlyLateMs + 12, windows)).toBe('miss');
  });

  it('widens perfect window with timing assist', () => {
    const base = getTimingWindows('hard', false, DEFAULT_TUNING);
    const assisted = getTimingWindows('hard', true, DEFAULT_TUNING);
    expect(assisted.perfectMs).toBeGreaterThan(base.perfectMs);
    expect(assisted.earlyLateMs).toBeGreaterThan(base.earlyLateMs);
  });
});
