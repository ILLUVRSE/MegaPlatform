import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cacheSize,
  getCached,
  getCacheStats,
  invalidateCached,
  resetCacheStats,
  setCached
} from '../../lib/ranking/cache';

describe('ranking cache', () => {
  beforeEach(() => {
    invalidateCached();
    resetCacheStats();
    vi.useRealTimers();
  });

  it('expires entries by ttl', () => {
    vi.useFakeTimers();
    setCached('ttl-key', { ok: true }, 1000);
    expect(getCached<{ ok: boolean }>('ttl-key')).toEqual({ ok: true });

    vi.advanceTimersByTime(1001);
    expect(getCached<{ ok: boolean }>('ttl-key')).toBeNull();
  });

  it('invalidates cached entries by prefix', () => {
    setCached('global:20:0', [1], 10_000);
    setCached('global:20:20', [2], 10_000);
    setCached('local:20:0', [3], 10_000);

    const removed = invalidateCached('global:');

    expect(removed).toBe(2);
    expect(getCached('global:20:0')).toBeNull();
    expect(getCached('global:20:20')).toBeNull();
    expect(getCached('local:20:0')).toEqual([3]);
  });

  it('evicts oldest entries when capacity is exceeded', () => {
    vi.useFakeTimers();
    for (let i = 0; i < 505; i += 1) {
      vi.advanceTimersByTime(1);
      setCached(`key:${i}`, i, 60_000);
    }

    expect(cacheSize()).toBeLessThanOrEqual(500);
    expect(getCached('key:0')).toBeNull();
    expect(getCached('key:504')).toBe(504);
  });

  it('tracks hit and miss ratios', () => {
    setCached('s', 1, 1000);
    expect(getCached('s')).toBe(1);
    expect(getCached('missing')).toBeNull();

    expect(getCacheStats()).toMatchObject({
      hits: 1,
      misses: 1,
      writes: 1,
      hitRate: 0.5
    });
  });
});
