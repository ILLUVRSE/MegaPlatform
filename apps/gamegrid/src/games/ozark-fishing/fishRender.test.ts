import { describe, expect, it } from 'vitest';
import { loadFishCatalog } from './fish';
import { loadFishVisualCatalog } from './content';
import { FishRenderSystem, FishSpritePool } from './fishRender';

describe('ozark fish render', () => {
  it('validates fish visuals json coverage and shape', () => {
    const fish = loadFishCatalog();
    const visuals = loadFishVisualCatalog();
    expect(Object.keys(visuals).length).toBeGreaterThanOrEqual(25);
    expect(visuals['ozark-muskie'].silhouette).toBe('muskie');
    expect(fish.every((entry) => !!visuals[entry.id])).toBe(true);
  });

  it('chooses species sprite keys deterministically for known species', () => {
    const render = new FishRenderSystem();
    expect(render.chooseSpriteKey('largemouth-bass', 'idle')).toBe('fish-bass-idle');
    expect(render.chooseSpriteKey('blue-catfish', 'thrash')).toBe('fish-catfish-thrash');
    expect(render.chooseSpriteKey('ozark-muskie', 'exhausted')).toBe('fish-muskie-exhausted');
  });

  it('reuses pooled instances', () => {
    const pool = new FishSpritePool(2);
    const a = pool.acquire();
    const b = pool.acquire();
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(pool.acquire()).toBeNull();
    if (a) pool.release(a);
    const c = pool.acquire();
    expect(c).toBe(a);
  });
});
