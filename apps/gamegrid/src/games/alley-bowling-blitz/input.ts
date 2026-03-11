import type { Sensitivity, SwipeRelease } from './types';

const MAX_SAMPLES = 24;

export interface SwipeCapture {
  xs: Float32Array;
  ys: Float32Array;
  ts: Float32Array;
  count: number;
  active: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sensitivityScale(sensitivity: Sensitivity): number {
  if (sensitivity === 'low') return 0.82;
  if (sensitivity === 'high') return 1.25;
  return 1;
}

export function createSwipeCapture(): SwipeCapture {
  return {
    xs: new Float32Array(MAX_SAMPLES),
    ys: new Float32Array(MAX_SAMPLES),
    ts: new Float32Array(MAX_SAMPLES),
    count: 0,
    active: false
  };
}

function pushSample(capture: SwipeCapture, x: number, y: number, t: number): void {
  if (capture.count < MAX_SAMPLES) {
    const idx = capture.count;
    capture.xs[idx] = x;
    capture.ys[idx] = y;
    capture.ts[idx] = t;
    capture.count += 1;
    return;
  }

  for (let i = 1; i < MAX_SAMPLES; i += 1) {
    capture.xs[i - 1] = capture.xs[i];
    capture.ys[i - 1] = capture.ys[i];
    capture.ts[i - 1] = capture.ts[i];
  }

  const last = MAX_SAMPLES - 1;
  capture.xs[last] = x;
  capture.ys[last] = y;
  capture.ts[last] = t;
}

export function beginSwipe(capture: SwipeCapture, x: number, y: number, t: number): void {
  capture.count = 0;
  capture.active = true;
  pushSample(capture, x, y, t);
}

export function updateSwipe(capture: SwipeCapture, x: number, y: number, t: number): void {
  if (!capture.active) return;
  pushSample(capture, x, y, t);
}

export function cancelSwipe(capture: SwipeCapture): void {
  capture.active = false;
  capture.count = 0;
}

export function completeSwipe(
  capture: SwipeCapture,
  sensitivity: Sensitivity,
  spinAssist: boolean,
  laneCenterX: number,
  defaultStartY: number
): SwipeRelease | null {
  if (!capture.active || capture.count < 2) {
    cancelSwipe(capture);
    return null;
  }

  const firstIndex = 0;
  const lastIndex = capture.count - 1;

  const startX = capture.xs[firstIndex];
  const startY = capture.ys[firstIndex];
  const endX = capture.xs[lastIndex];
  const endY = capture.ys[lastIndex];
  const startT = capture.ts[firstIndex];
  const endT = capture.ts[lastIndex];

  const dx = endX - startX;
  const dy = endY - startY;
  const upward = -(dy);

  if (upward < 28) {
    cancelSwipe(capture);
    return null;
  }

  const dtSec = Math.max(0.016, (endT - startT) / 1000);
  const distance = Math.sqrt(dx * dx + dy * dy);
  const speed = clamp((distance / dtSec) * 0.8 * sensitivityScale(sensitivity), 230, 900);

  const angle = clamp(Math.atan2(dx, upward), -0.42, 0.42);

  const mid = Math.floor((firstIndex + lastIndex) * 0.5);
  const mx = capture.xs[mid];
  const my = capture.ys[mid];

  const lineDx = endX - startX;
  const lineDy = endY - startY;
  const lineLen = Math.max(1, Math.sqrt(lineDx * lineDx + lineDy * lineDy));

  const signedDistance = ((mx - startX) * lineDy - (my - startY) * lineDx) / lineLen;
  const centerBias = clamp((startX - laneCenterX) / 200, -1, 1) * 12;

  let spin = clamp((signedDistance + centerBias) * 0.016, -2.3, 2.3);
  if (spinAssist) {
    spin = clamp(spin * 0.65 + angle * 1.2, -1.4, 1.4);
  }

  cancelSwipe(capture);

  return {
    startX,
    startY: Number.isFinite(startY) ? startY : defaultStartY,
    angle,
    speed,
    spin
  };
}
