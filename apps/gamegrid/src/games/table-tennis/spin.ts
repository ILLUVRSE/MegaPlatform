import type { SpinHint } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function spinHintFromValue(spin: number): SpinHint {
  if (spin >= 0.18) return 'top';
  if (spin <= -0.18) return 'back';
  return 'none';
}

export function mapSwipeToSpin(curve: number, topComponent: number, assist: boolean, spinAssist: boolean): number {
  let spin = clamp(topComponent * 0.72 + curve * 0.58, -1, 1);
  if (assist) spin *= 0.72;
  if (spinAssist) spin *= 0.78;
  return clamp(spin, -1, 1);
}

export function mapSpinToBounce(speedY: number, speedX: number, spin: number): { speedY: number; speedX: number } {
  const forward = speedY * (1 + spin * 0.11);
  const lateral = speedX + spin * 16;
  return {
    speedY: forward,
    speedX: lateral
  };
}
