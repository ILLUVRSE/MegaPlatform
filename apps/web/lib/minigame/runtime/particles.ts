import type { SeededRng } from "../rng";

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
};

export class ParticleSystem {
  private particles: Particle[] = [];

  constructor(private rng: SeededRng) {}

  spawnBurst(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i += 1) {
      const angle = this.rng.nextFloat(0, Math.PI * 2);
      const speed = this.rng.nextFloat(40, 180);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: this.rng.nextFloat(0.4, 0.9),
        size: this.rng.nextFloat(2, 5),
        color
      });
    }
  }

  step(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
      particle.vy += 60 * dt;
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const particle of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, particle.life);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
      ctx.restore();
    }
  }
}
