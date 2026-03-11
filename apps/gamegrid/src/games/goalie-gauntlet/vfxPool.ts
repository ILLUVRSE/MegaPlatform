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

const PARTICLE_POOL_SIZE = 56;

export class GoalieVfxPool {
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
        gravity: 140
      });
    }
  }

  emitSave(x: number, y: number, perfect: boolean, reducedMotion: boolean): void {
    const count = reducedMotion ? (perfect ? 5 : 4) : perfect ? 16 : 10;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / Math.max(1, count)) * Math.PI * 2;
      const speed = perfect ? 190 : 140;
      this.spawnParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 40,
        perfect ? 320 : 220,
        perfect ? 0x99f4ff : 0xe8f6ff,
        perfect ? 3.5 : 2.6,
        140
      );
    }
  }

  emitGoal(x: number, y: number, reducedMotion: boolean): void {
    const count = reducedMotion ? 4 : 10;
    for (let i = 0; i < count; i += 1) {
      const spread = i - Math.floor(count / 2);
      this.spawnParticle(x + spread * 6, y, spread * 22, -60 - i * 14, 280, 0xff8d8d, 3, 140);
    }
  }

  emitIceSpray(x: number, y: number, dir: -1 | 1, reducedMotion: boolean, color = 0xdcf7ff): void {
    const count = reducedMotion ? 4 : 12;
    for (let i = 0; i < count; i += 1) {
      const drift = (i - Math.floor(count / 2)) * 10;
      this.spawnParticle(
        x + dir * 26,
        y,
        dir * (120 + i * 12) + drift * 0.3,
        -80 - i * 10,
        220,
        color,
        2.3,
        70
      );
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
