import Phaser from 'phaser';

interface VfxParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifeMs: number;
  maxLifeMs: number;
  color: number;
  size: number;
  gravity: number;
}

const PARTICLE_POOL_SIZE = 64;

export class BowlingVfxPool {
  private readonly particles: VfxParticle[] = [];

  constructor() {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i += 1) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        lifeMs: 0,
        maxLifeMs: 0,
        color: 0xffffff,
        size: 2,
        gravity: 220
      });
    }
  }

  emitImpact(x: number, y: number, strong: boolean): void {
    const count = strong ? 10 : 6;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / Math.max(1, count)) * Math.PI * 2;
      const speed = strong ? 180 : 120;
      this.spawnParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 40,
        strong ? 320 : 220,
        strong ? 0xfff2c6 : 0xffffff,
        strong ? 3.2 : 2.4,
        220
      );
    }
  }

  emitStrikeBurst(x: number, y: number): void {
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 220;
      this.spawnParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 60, 360, 0xffd98a, 3.4, 180);
    }
  }

  update(dtMs: number): void {
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.lifeMs += dtMs;
      if (p.lifeMs >= p.maxLifeMs) {
        p.active = false;
        continue;
      }
      p.x += p.vx * (dtMs / 1000);
      p.y += p.vy * (dtMs / 1000);
      p.vy += p.gravity * (dtMs / 1000);
    }
  }

  render(gfx: Phaser.GameObjects.Graphics): void {
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      if (!p.active) continue;
      const alpha = 1 - p.lifeMs / p.maxLifeMs;
      gfx.fillStyle(p.color, alpha);
      gfx.fillCircle(p.x, p.y, p.size * alpha);
    }
  }

  private spawnParticle(x: number, y: number, vx: number, vy: number, maxLifeMs: number, color: number, size: number, gravity: number): void {
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.lifeMs = 0;
      p.maxLifeMs = maxLifeMs;
      p.color = color;
      p.size = size;
      p.gravity = gravity;
      return;
    }
  }
}
