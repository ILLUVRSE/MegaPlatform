import { describe, expect, it } from 'vitest';
import {
  activeParticleCount,
  activeRippleCount,
  createParticlePool,
  createRipplePool,
  spawnParticle,
  spawnRipple,
  updateParticles,
  updateRipples
} from './vfxPool';

describe('ozark vfx pooling', () => {
  it('reuses ripple objects instead of allocating new ones', () => {
    const pool = createRipplePool(2);
    const a = spawnRipple(pool, 10, 10, 4, 20, 1, 0.5);
    const b = spawnRipple(pool, 20, 20, 5, 20, 1, 0.5);
    const c = spawnRipple(pool, 30, 30, 6, 20, 1, 0.5);

    expect(a).toBe(c);
    expect(a).not.toBe(b);
    expect(activeRippleCount(pool)).toBe(2);

    updateRipples(pool, 1);
    expect(activeRippleCount(pool)).toBe(0);
  });

  it('reuses particle objects and updates in place', () => {
    const pool = createParticlePool(1);
    const p1 = spawnParticle(pool, 1, 1, 10, -5, 2, 1, 1);
    const p2 = spawnParticle(pool, 2, 2, 10, -5, 2, 1, 1);

    expect(p1).toBe(p2);
    expect(activeParticleCount(pool)).toBe(1);

    updateParticles(pool, 0.5);
    expect(pool.items[0].x).toBeGreaterThan(2);
    updateParticles(pool, 0.6);
    expect(activeParticleCount(pool)).toBe(0);
  });
});
