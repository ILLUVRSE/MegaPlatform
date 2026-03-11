import { describe, expect, it } from 'vitest';
import { clearRateLimitState, consumeRateLimit } from '../../api/src/utils/rateLimit';

describe('rate limit utility', () => {
  it('blocks requests over limit within active window', () => {
    clearRateLimitState();
    const now = Date.now();
    expect(consumeRateLimit('k', 2, 60_000, now).allowed).toBe(true);
    expect(consumeRateLimit('k', 2, 60_000, now + 1).allowed).toBe(true);
    expect(consumeRateLimit('k', 2, 60_000, now + 2).allowed).toBe(false);
  });

  it('resets counters after window elapses', () => {
    clearRateLimitState();
    const now = Date.now();
    consumeRateLimit('k', 1, 1000, now);
    expect(consumeRateLimit('k', 1, 1000, now + 100)).toMatchObject({ allowed: false });
    expect(consumeRateLimit('k', 1, 1000, now + 1001)).toMatchObject({ allowed: true });
  });
});
