import Phaser from 'phaser';
import type { EffectsLevel } from '../config/tuning';

interface Particle {
  sprite: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  gravity: number;
  active: boolean;
}

export class ParticlePool {
  private readonly scene: Phaser.Scene;
  private readonly particles: Particle[];
  private cursor = 0;

  constructor(scene: Phaser.Scene, size: number) {
    this.scene = scene;
    this.particles = Array.from({ length: size }, () => ({
      sprite: scene.add.circle(0, 0, 2, 0xffffff, 1).setVisible(false),
      vx: 0,
      vy: 0,
      life: 0,
      ttl: 0,
      gravity: 0,
      active: false
    }));
  }

  emitBurst(x: number, y: number, options: { count: number; color: number; speed: number; spread: number; gravity: number; life: number }) {
    for (let i = 0; i < options.count; i += 1) {
      const particle = this.particles[this.cursor];
      this.cursor = (this.cursor + 1) % this.particles.length;
      const angle = (Math.random() - 0.5) * options.spread;
      const speed = options.speed * (0.6 + Math.random() * 0.5);
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed - options.speed * 0.25;
      particle.gravity = options.gravity;
      particle.life = options.life;
      particle.ttl = options.life;
      particle.active = true;
      particle.sprite.setPosition(x, y).setFillStyle(options.color, 0.9).setVisible(true).setAlpha(1);
    }
  }

  update(dt: number) {
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.sprite.setVisible(false);
        continue;
      }
      p.vy += p.gravity * dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      p.sprite.setAlpha(Math.max(0, p.life / p.ttl));
    }
  }

  setDepth(depth: number) {
    for (const p of this.particles) {
      p.sprite.setDepth(depth);
    }
  }
}

export function resolveSparkCount(level: EffectsLevel, base: number) {
  if (level === 'off') return 0;
  if (level === 'low') return Math.max(4, Math.floor(base * 0.55));
  return base;
}
