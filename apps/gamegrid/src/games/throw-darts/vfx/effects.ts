import Phaser from 'phaser';
import type { DartHit, ThrowDartsVfxLevel } from '../types';
import { createParticlePool, createRipplePool, spawnParticle, spawnRipple, updateParticles, updateRipples } from './pool';

export interface ThrowDartsVfxState {
  ripples: ReturnType<typeof createRipplePool>;
  particles: ReturnType<typeof createParticlePool>;
  gfx: Phaser.GameObjects.Graphics;
}

export function createThrowDartsVfx(scene: Phaser.Scene): ThrowDartsVfxState {
  return {
    ripples: createRipplePool(20),
    particles: createParticlePool(40),
    gfx: scene.add.graphics()
  };
}

export function spawnHitVfx(state: ThrowDartsVfxState, x: number, y: number, hit: DartHit, level: ThrowDartsVfxLevel) {
  if (level === 'off') return;
  if (hit.ring === 'miss' || hit.score <= 0) return;
  const rippleCount = level === 'high' ? 2 : 1;
  const dustCount = level === 'high' ? 7 : 3;
  for (let i = 0; i < rippleCount; i += 1) {
    spawnRipple(state.ripples, x, y, hit.isBull ? 8 : 10, hit.isBull ? 70 : 50, hit.isBull ? 0.8 : 0.6, hit.isBull ? 0.45 : 0.35);
  }
  for (let i = 0; i < dustCount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = hit.isBull ? 60 : 40;
    spawnParticle(
      state.particles,
      x,
      y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 20,
      hit.isBull ? 3 : 2,
      hit.isBull ? 0.9 : 0.7,
      hit.isBull ? 0.45 : 0.35
    );
  }
}

export function spawnBustVfx(state: ThrowDartsVfxState, x: number, y: number, level: ThrowDartsVfxLevel) {
  if (level === 'off') return;
  spawnRipple(state.ripples, x, y, 18, 120, 0.35, 0.3);
}

export function updateThrowDartsVfx(state: ThrowDartsVfxState, dtSec: number, level: ThrowDartsVfxLevel) {
  if (level === 'off') {
    state.gfx.clear();
    return;
  }
  updateRipples(state.ripples, dtSec);
  updateParticles(state.particles, dtSec);

  const g = state.gfx;
  g.clear();

  for (const ripple of state.ripples.items) {
    if (!ripple.active) continue;
    g.lineStyle(2, 0xfff2b0, ripple.alpha);
    g.strokeCircle(ripple.x, ripple.y, ripple.radius);
  }

  for (const particle of state.particles.items) {
    if (!particle.active) continue;
    g.fillStyle(0xffffff, particle.alpha);
    g.fillCircle(particle.x, particle.y, particle.size);
  }
}
