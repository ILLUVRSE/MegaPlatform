import type { AimState, SpinState, Vec2 } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createAimState(): AimState {
  return {
    active: false,
    pointerId: -1,
    aimX: 1,
    aimY: 0,
    power: 0,
    canceled: false
  };
}

export function beginAim(state: AimState, pointerId: number): void {
  state.active = true;
  state.pointerId = pointerId;
  state.power = 0;
  state.canceled = false;
}

export function updateAim(state: AimState, cueX: number, cueY: number, pointerX: number, pointerY: number): void {
  const dx = cueX - pointerX;
  const dy = cueY - pointerY;
  const mag = Math.hypot(dx, dy);
  if (mag > 12) {
    state.aimX = dx / mag;
    state.aimY = dy / mag;
  }
  state.power = clamp((mag - 48) / 220, 0, 1);
}

export function cancelAim(state: AimState): void {
  state.canceled = true;
  state.active = false;
  state.pointerId = -1;
  state.power = 0;
}

export function endAim(state: AimState, pointerId: number): { direction: Vec2; power: number } | null {
  if (!state.active || state.pointerId !== pointerId || state.canceled) {
    state.active = false;
    state.pointerId = -1;
    return null;
  }

  const power = state.power;
  const dir = { x: state.aimX, y: state.aimY };
  state.active = false;
  state.pointerId = -1;
  state.power = 0;

  if (power <= 0.04) return null;
  return { direction: dir, power };
}

export function createSpinState(): SpinState {
  return { open: false, x: 0, y: 0 };
}

export function setSpinFromWidget(state: SpinState, localX: number, localY: number, radius: number): void {
  const nx = localX / radius;
  const ny = localY / radius;
  const mag = Math.hypot(nx, ny);
  if (mag <= 1) {
    state.x = nx;
    state.y = ny;
    return;
  }
  state.x = nx / mag;
  state.y = ny / mag;
}
