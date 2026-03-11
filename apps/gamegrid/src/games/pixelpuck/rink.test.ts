import { describe, expect, it } from 'vitest';
import { loadRinks } from './rink';

describe('pixelpuck rink loader', () => {
  it('loads required variants with required fields', () => {
    const rinks = loadRinks();
    const ids = rinks.map((rink) => rink.id);

    expect(rinks.length).toBeGreaterThanOrEqual(3);
    expect(ids).toEqual(expect.arrayContaining(['classic', 'narrow-goals', 'obstacles']));

    for (const rink of rinks) {
      expect(rink.bounds.width).toBeGreaterThan(0);
      expect(rink.bounds.height).toBeGreaterThan(0);
      expect(rink.goals.top.width).toBeGreaterThan(0);
      expect(rink.goals.bottom.width).toBeGreaterThan(0);
      expect(Array.isArray(rink.obstacles)).toBe(true);
    }
  });
});
