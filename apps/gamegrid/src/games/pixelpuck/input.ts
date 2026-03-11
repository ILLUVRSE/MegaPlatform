import type { PaddleState, PixelPuckSensitivity, SensitivityParams } from './types';

const SENSITIVITY: Record<PixelPuckSensitivity, SensitivityParams> = {
  low: { maxSpeed: 780, accel: 1800, smoothing: 0.32 },
  medium: { maxSpeed: 1040, accel: 2550, smoothing: 0.24 },
  high: { maxSpeed: 1280, accel: 3300, smoothing: 0.18 }
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function smoothFactor(base: number, dt: number) {
  const clamped = clamp(base, 0, 0.8);
  return 1 - Math.pow(1 - clamped, dt * 60);
}

export interface PointerControllerState {
  pointerId: number;
  active: boolean;
  lastX: number;
  lastY: number;
  lastTime: number;
  dragVX: number;
  dragVY: number;
  smashCooldown: number;
  smashActiveUntil: number;
  targetX: number;
  targetY: number;
  filteredX: number;
  filteredY: number;
}

export function createPointerController(): PointerControllerState {
  return {
    pointerId: -1,
    active: false,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    dragVX: 0,
    dragVY: 0,
    smashCooldown: 0,
    smashActiveUntil: 0,
    targetX: 0,
    targetY: 0,
    filteredX: 0,
    filteredY: 0
  };
}

export function setPointerDown(state: PointerControllerState, pointerId: number, x: number, y: number, nowMs: number) {
  state.pointerId = pointerId;
  state.active = true;
  state.lastX = x;
  state.lastY = y;
  state.lastTime = nowMs;
  state.targetX = x;
  state.targetY = y;
  state.filteredX = x;
  state.filteredY = y;
  state.dragVX = 0;
  state.dragVY = 0;
}

export function setPointerUp(state: PointerControllerState, pointerId: number) {
  if (state.pointerId !== pointerId) return;
  state.active = false;
  state.pointerId = -1;
  state.dragVX = 0;
  state.dragVY = 0;
}

export function updatePointer(
  state: PointerControllerState,
  pointerId: number,
  x: number,
  y: number,
  nowMs: number,
  powerSmashEnabled: boolean
) {
  if (!state.active || pointerId !== state.pointerId) return;
  const dt = Math.max(1, nowMs - state.lastTime);
  const rawDx = x - state.lastX;
  const rawDy = y - state.lastY;
  const deadzone = 1.8;
  if (Math.hypot(rawDx, rawDy) < deadzone) {
    state.lastTime = nowMs;
    return;
  }
  const vx = (rawDx / dt) * 1000;
  const vy = (rawDy / dt) * 1000;

  state.dragVX = state.dragVX * 0.6 + vx * 0.4;
  state.dragVY = state.dragVY * 0.6 + vy * 0.4;
  state.lastX = x;
  state.lastY = y;
  state.lastTime = nowMs;
  state.targetX = x;
  state.targetY = y;

  if (powerSmashEnabled && state.smashCooldown <= 0) {
    const speed = Math.hypot(state.dragVX, state.dragVY);
    if (speed > 1700) {
      state.smashActiveUntil = nowMs + 450;
      state.smashCooldown = 8000;
    }
  }
}

export function getPointerTarget(state: PointerControllerState, dt: number, smoothingOverride?: number) {
  const base = smoothingOverride ?? 0;
  const alpha = smoothFactor(base, dt);
  state.filteredX += (state.targetX - state.filteredX) * alpha;
  state.filteredY += (state.targetY - state.filteredY) * alpha;
  return { x: state.filteredX, y: state.filteredY };
}

export function updatePointerFilter(state: PointerControllerState, dt: number, smoothingOverride?: number) {
  const base = smoothingOverride ?? 0;
  const alpha = smoothFactor(base, dt);
  state.filteredX += (state.targetX - state.filteredX) * alpha;
  state.filteredY += (state.targetY - state.filteredY) * alpha;
}

export function clampTargetToBounds(
  targetX: number,
  targetY: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
) {
  return {
    x: clamp(targetX, bounds.minX, bounds.maxX),
    y: clamp(targetY, bounds.minY, bounds.maxY)
  };
}

export function stepPointerPhysics(
  state: PointerControllerState,
  paddle: PaddleState,
  desiredX: number,
  desiredY: number,
  dt: number,
  sensitivity: PixelPuckSensitivity,
  assist: boolean,
  sticky: number,
  smoothingOverride?: number
) {
  const params = SENSITIVITY[sensitivity];
  const smoothBase = smoothingOverride ?? params.smoothing ?? 0;
  const alpha = smoothFactor(smoothBase, dt);

  state.filteredX += (desiredX - state.filteredX) * alpha;
  state.filteredY += (desiredY - state.filteredY) * alpha;

  const dx = state.filteredX - paddle.x;
  const dy = state.filteredY - paddle.y;
  const distance = Math.hypot(dx, dy);
  const stickyBoost = 1 + clamp(sticky, 0, 0.8) * clamp(distance / 160, 0, 1);

  const desiredVx = clamp(dx * 10, -params.maxSpeed, params.maxSpeed) * stickyBoost;
  const desiredVy = clamp(dy * 10, -params.maxSpeed, params.maxSpeed) * stickyBoost;

  const aimDamping = assist ? 0.86 : 1;

  const ax = clamp(((desiredVx * aimDamping) - paddle.vx) / dt, -params.accel, params.accel);
  const ay = clamp(((desiredVy * aimDamping) - paddle.vy) / dt, -params.accel, params.accel);

  paddle.vx += ax * dt;
  paddle.vy += ay * dt;

  const maxSpeed = params.maxSpeed * stickyBoost;
  const speed = Math.hypot(paddle.vx, paddle.vy);
  if (speed > maxSpeed) {
    const inv = maxSpeed / speed;
    paddle.vx *= inv;
    paddle.vy *= inv;
  }

  paddle.x += paddle.vx * dt;
  paddle.y += paddle.vy * dt;

  state.smashCooldown = Math.max(0, state.smashCooldown - dt * 1000);
}

export function isSmashActive(state: PointerControllerState, nowMs: number) {
  return nowMs <= state.smashActiveUntil;
}

export function smashCooldownRatio(state: PointerControllerState) {
  return state.smashCooldown <= 0 ? 1 : Math.max(0, Math.min(1, 1 - state.smashCooldown / 8000));
}
