import Phaser from 'phaser';
import { clamp } from '../config/tuning';

export interface Particle {
  obj: Phaser.GameObjects.Arc;
  life: number;
  vx: number;
  vy: number;
}

export class ParticlePool {
  private readonly pool: Particle[] = [];

  constructor(private readonly scene: Phaser.Scene, size: number, radius: number, color: number) {
    for (let i = 0; i < size; i += 1) {
      const obj = scene.add.circle(0, 0, radius, color, 0.9).setVisible(false);
      this.pool.push({ obj, life: 0, vx: 0, vy: 0 });
    }
  }

  spawnBurst(x: number, y: number, count: number, speed: number, life: number, spread = Math.PI * 2) {
    let remaining = count;
    for (let i = 0; i < this.pool.length && remaining > 0; i += 1) {
      const particle = this.pool[i];
      if (particle.life > 0) continue;
      particle.life = life;
      const angle = Math.random() * spread;
      const mag = speed * (0.6 + Math.random() * 0.6);
      particle.vx = Math.cos(angle) * mag;
      particle.vy = Math.sin(angle) * mag;
      particle.obj.setPosition(x, y).setVisible(true).setAlpha(0.9);
      remaining -= 1;
    }
  }

  update(dt: number) {
    for (let i = 0; i < this.pool.length; i += 1) {
      const particle = this.pool[i];
      if (particle.life <= 0) continue;
      particle.life -= dt;
      particle.obj.x += particle.vx * dt;
      particle.obj.y += particle.vy * dt;
      particle.obj.setAlpha(clamp(particle.life / 0.4, 0, 1));
      if (particle.life <= 0) {
        particle.obj.setVisible(false);
      }
    }
  }

  hideAll() {
    for (let i = 0; i < this.pool.length; i += 1) {
      const particle = this.pool[i];
      particle.life = 0;
      particle.obj.setVisible(false);
    }
  }
}
