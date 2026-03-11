import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearQueryCache,
  getQueryCache,
  queryCacheSize,
  setQueryCache
} from '../../lib/search/queryCache';

describe('search query cache', () => {
  beforeEach(() => {
    clearQueryCache();
    vi.useRealTimers();
  });

  it('expires entries using ttl', () => {
    vi.useFakeTimers();
    setQueryCache('k', [1], 1000);
    expect(getQueryCache<number[]>('k')).toEqual([1]);
    vi.advanceTimersByTime(1001);
    expect(getQueryCache<number[]>('k')).toBeNull();
  });

  it('evicts oldest entries at max size', () => {
    vi.useFakeTimers();
    for (let i = 0; i < 305; i += 1) {
      vi.advanceTimersByTime(1);
      setQueryCache(`k:${i}`, i, 10_000);
    }
    expect(queryCacheSize()).toBeLessThanOrEqual(300);
    expect(getQueryCache('k:0')).toBeNull();
    expect(getQueryCache('k:304')).toBe(304);
  });
});
