export interface RippleFx {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  growthPerSec: number;
  alpha: number;
  age: number;
  lifeSec: number;
}

export interface ParticleFx {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  age: number;
  lifeSec: number;
}

export interface RipplePool {
  items: RippleFx[];
  cursor: number;
}

export interface ParticlePool {
  items: ParticleFx[];
  cursor: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createRipplePool(size: number): RipplePool {
  const items: RippleFx[] = [];
  for (let i = 0; i < size; i += 1) {
    items.push({
      active: false,
      x: 0,
      y: 0,
      radius: 0,
      growthPerSec: 0,
      alpha: 0,
      age: 0,
      lifeSec: 0
    });
  }
  return { items, cursor: 0 };
}

export function spawnRipple(pool: RipplePool, x: number, y: number, radius: number, growthPerSec: number, alpha: number, lifeSec: number): RippleFx {
  const item = pool.items[pool.cursor];
  pool.cursor = (pool.cursor + 1) % pool.items.length;
  item.active = true;
  item.x = x;
  item.y = y;
  item.radius = radius;
  item.growthPerSec = growthPerSec;
  item.alpha = alpha;
  item.age = 0;
  item.lifeSec = Math.max(0.001, lifeSec);
  return item;
}

export function updateRipples(pool: RipplePool, dtSec: number): void {
  for (let i = 0; i < pool.items.length; i += 1) {
    const item = pool.items[i];
    if (!item.active) continue;
    item.age += dtSec;
    item.radius += item.growthPerSec * dtSec;
    item.alpha = clamp(1 - item.age / item.lifeSec, 0, 1) * item.alpha;
    if (item.age >= item.lifeSec) {
      item.active = false;
    }
  }
}

export function createParticlePool(size: number): ParticlePool {
  const items: ParticleFx[] = [];
  for (let i = 0; i < size; i += 1) {
    items.push({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 1,
      alpha: 0,
      age: 0,
      lifeSec: 0
    });
  }
  return { items, cursor: 0 };
}

export function spawnParticle(pool: ParticlePool, x: number, y: number, vx: number, vy: number, size: number, alpha: number, lifeSec: number): ParticleFx {
  const item = pool.items[pool.cursor];
  pool.cursor = (pool.cursor + 1) % pool.items.length;
  item.active = true;
  item.x = x;
  item.y = y;
  item.vx = vx;
  item.vy = vy;
  item.size = size;
  item.alpha = alpha;
  item.age = 0;
  item.lifeSec = Math.max(0.001, lifeSec);
  return item;
}

export function updateParticles(pool: ParticlePool, dtSec: number): void {
  for (let i = 0; i < pool.items.length; i += 1) {
    const item = pool.items[i];
    if (!item.active) continue;
    item.age += dtSec;
    item.x += item.vx * dtSec;
    item.y += item.vy * dtSec;
    item.vy *= 0.985;
    item.alpha = clamp(1 - item.age / item.lifeSec, 0, 1) * item.alpha;
    if (item.age >= item.lifeSec) {
      item.active = false;
    }
  }
}
