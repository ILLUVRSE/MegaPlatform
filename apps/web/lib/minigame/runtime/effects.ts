import type { SeededRng } from "../rng";
import { ParticleSystem } from "./particles";

export class EffectsManager {
  private shakeTimer = 0;
  private shakeIntensity = 0;
  private flashTimer = 0;
  private flashColor = "#ffffff";
  private particles: ParticleSystem;

  constructor(private rng: SeededRng) {
    this.particles = new ParticleSystem(rng);
  }

  shake(duration = 0.2, intensity = 6) {
    this.shakeTimer = Math.max(this.shakeTimer, duration);
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  flash(color = "#ffffff", duration = 0.12) {
    this.flashTimer = Math.max(this.flashTimer, duration);
    this.flashColor = color;
  }

  spawnParticles(x: number, y: number, color: string, count = 16) {
    this.particles.spawnBurst(x, y, color, count);
  }

  step(dt: number) {
    this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.particles.step(dt);
  }

  getShakeOffset() {
    if (this.shakeTimer <= 0) return { x: 0, y: 0 };
    const magnitude = this.shakeIntensity * (this.shakeTimer / 0.2);
    return {
      x: this.rng.nextFloat(-magnitude, magnitude),
      y: this.rng.nextFloat(-magnitude, magnitude)
    };
  }

  render(ctx: CanvasRenderingContext2D) {
    this.particles.render(ctx);
    if (this.flashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.35, this.flashTimer / 0.12);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }
  }
}
