import type { BallState, PinState } from './types';

const PIN_RADIUS = 11;
const PIN_SLEEP_SPEED = 4;
const PIN_SLEEP_ANG = 0.1;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createRack(centerX: number, frontY: number, spacing = 28): PinState[] {
  const pins: PinState[] = [];
  let id = 1;
  for (let row = 0; row < 4; row += 1) {
    const count = row + 1;
    const rowY = frontY - row * spacing;
    const left = centerX - (count - 1) * spacing * 0.5;
    for (let i = 0; i < count; i += 1) {
      pins.push({
        id,
        x: left + i * spacing,
        y: rowY,
        vx: 0,
        vy: 0,
        angle: 0,
        angVel: 0,
        fallen: false,
        sleeping: false,
        active: true
      });
      id += 1;
    }
  }
  return pins;
}

export function resetRackToStanding(pins: PinState[], standingIds: readonly number[], centerX: number, frontY: number, spacing = 28): void {
  const template = createRack(centerX, frontY, spacing);
  const standing = new Set<number>(standingIds);
  for (let i = 0; i < pins.length; i += 1) {
    const src = template[i];
    const pin = pins[i];
    pin.x = src.x;
    pin.y = src.y;
    pin.vx = 0;
    pin.vy = 0;
    pin.angle = 0;
    pin.angVel = 0;
    pin.fallen = false;
    pin.sleeping = false;
    pin.active = standing.has(pin.id);
  }
}

export function isPinStanding(pin: PinState): boolean {
  return pin.active && !pin.fallen && Math.abs(pin.angle) < 0.36;
}

export function countStandingPins(pins: readonly PinState[]): number {
  let standing = 0;
  for (let i = 0; i < pins.length; i += 1) {
    if (isPinStanding(pins[i])) standing += 1;
  }
  return standing;
}

export function standingPinIds(pins: readonly PinState[]): number[] {
  const ids: number[] = [];
  for (let i = 0; i < pins.length; i += 1) {
    if (isPinStanding(pins[i])) ids.push(pins[i].id);
  }
  return ids;
}

function resolvePinCollision(a: PinState, b: PinState): void {
  if (!a.active || !b.active) return;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const minDist = PIN_RADIUS * 2;
  const distSq = dx * dx + dy * dy;
  if (distSq >= minDist * minDist || distSq <= 1e-4) return;

  const dist = Math.sqrt(distSq);
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;

  a.x -= nx * overlap * 0.5;
  a.y -= ny * overlap * 0.5;
  b.x += nx * overlap * 0.5;
  b.y += ny * overlap * 0.5;

  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const relN = rvx * nx + rvy * ny;
  if (relN > 0) return;

  const impulse = -relN * 0.75;
  a.vx -= nx * impulse;
  a.vy -= ny * impulse;
  b.vx += nx * impulse;
  b.vy += ny * impulse;

  const spinKick = impulse * 0.02;
  a.angVel -= spinKick;
  b.angVel += spinKick;

  if (Math.abs(impulse) > 18) {
    a.fallen = true;
    b.fallen = true;
  }
}

function resolveBallPinCollision(ball: BallState, pin: PinState): boolean {
  if (!ball.active || !pin.active) return false;
  const dx = pin.x - ball.x;
  const dy = pin.y - ball.y;
  const minDist = PIN_RADIUS + 13;
  const distSq = dx * dx + dy * dy;
  if (distSq >= minDist * minDist || distSq <= 1e-4) return false;

  const dist = Math.sqrt(distSq);
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;

  pin.x += nx * overlap;
  pin.y += ny * overlap;

  const approach = -(ball.vx * nx + ball.vy * ny);
  if (approach <= 0) return false;

  const transfer = approach * 0.66;
  pin.vx += nx * transfer;
  pin.vy += ny * transfer;
  pin.angVel += clamp((ball.vx * ny - ball.vy * nx) * 0.008, -2.6, 2.6);
  pin.fallen = pin.fallen || transfer > 45;

  ball.vx *= 0.87;
  ball.vy *= 0.9;
  return true;
}

export function stepPinPhysics(pins: PinState[], ball: BallState, dt: number): number {
  let hits = 0;

  for (let i = 0; i < pins.length; i += 1) {
    const pin = pins[i];
    if (!pin.active) continue;

    if (resolveBallPinCollision(ball, pin)) {
      hits += 1;
    }

    pin.x += pin.vx * dt;
    pin.y += pin.vy * dt;
    pin.angle += pin.angVel * dt;

    if (pin.fallen) {
      const target = pin.angle >= 0 ? 1.48 : -1.48;
      pin.angle += (target - pin.angle) * Math.min(1, dt * 4);
    }

    pin.vx *= Math.max(0, 1 - dt * 4.8);
    pin.vy *= Math.max(0, 1 - dt * 4.8);
    pin.angVel *= Math.max(0, 1 - dt * 6.2);

    if (Math.abs(pin.angle) > 0.72) pin.fallen = true;

    if (Math.abs(pin.vx) < PIN_SLEEP_SPEED && Math.abs(pin.vy) < PIN_SLEEP_SPEED && Math.abs(pin.angVel) < PIN_SLEEP_ANG) {
      pin.vx = 0;
      pin.vy = 0;
      pin.angVel = 0;
      pin.sleeping = true;
    } else {
      pin.sleeping = false;
    }
  }

  for (let i = 0; i < pins.length; i += 1) {
    for (let j = i + 1; j < pins.length; j += 1) {
      resolvePinCollision(pins[i], pins[j]);
    }
  }

  return hits;
}

export function pinsSettled(pins: readonly PinState[]): boolean {
  for (let i = 0; i < pins.length; i += 1) {
    const pin = pins[i];
    if (!pin.active) continue;
    if (!pin.sleeping) return false;
  }
  return true;
}
