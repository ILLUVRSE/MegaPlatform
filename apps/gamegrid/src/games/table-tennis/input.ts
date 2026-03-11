import { mapSwipeToSpin, spinHintFromValue } from './spin';
import type { PaddleShot, SpinHint, SwipeMetrics, TableTennisSensitivity } from './types';

const MAX_SWIPE_POINTS = 24;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sensitivityMultiplier(sensitivity: TableTennisSensitivity): number {
  if (sensitivity === 'low') return 0.82;
  if (sensitivity === 'high') return 1.18;
  return 1;
}

export function createSwipeCapture() {
  const x = new Float32Array(MAX_SWIPE_POINTS);
  const y = new Float32Array(MAX_SWIPE_POINTS);
  const t = new Float32Array(MAX_SWIPE_POINTS);

  let active = false;
  let pointerId = -1;
  let count = 0;

  return {
    pointerDown(id: number, px: number, py: number, timeMs: number) {
      active = true;
      pointerId = id;
      count = 1;
      x[0] = px;
      y[0] = py;
      t[0] = timeMs;
    },
    pointerMove(id: number, px: number, py: number, timeMs: number) {
      if (!active || id !== pointerId) return;
      const idx = count < MAX_SWIPE_POINTS ? count : MAX_SWIPE_POINTS - 1;
      x[idx] = px;
      y[idx] = py;
      t[idx] = timeMs;
      if (count < MAX_SWIPE_POINTS) count += 1;
    },
    pointerUp(id: number, px: number, py: number, timeMs: number): SwipeMetrics | null {
      if (!active || id !== pointerId) return null;

      const idx = count < MAX_SWIPE_POINTS ? count : MAX_SWIPE_POINTS - 1;
      x[idx] = px;
      y[idx] = py;
      t[idx] = timeMs;
      if (count < MAX_SWIPE_POINTS) count += 1;

      const startX = x[0];
      const startY = y[0];
      const endX = x[count - 1];
      const endY = y[count - 1];

      const horizontal = endX - startX;
      const vertical = endY - startY;
      const durationMs = Math.max(12, t[count - 1] - t[0]);
      const distance = Math.hypot(horizontal, vertical);
      if (distance < 18) {
        active = false;
        pointerId = -1;
        count = 0;
        return null;
      }

      const midIndex = Math.floor((count - 1) / 2);
      const expectedMidY = (startY + endY) * 0.5;
      const curve = clamp((expectedMidY - y[midIndex]) / 120, -1, 1);
      const topComponent = clamp((-vertical) / 230, -1, 1);

      active = false;
      pointerId = -1;
      count = 0;

      return {
        startX,
        startY,
        endX,
        endY,
        durationMs,
        distance,
        horizontal,
        vertical,
        curve,
        topComponent
      };
    },
    isActive() {
      return active;
    }
  };
}

export function swipeToShot(
  swipe: SwipeMetrics,
  sensitivity: TableTennisSensitivity,
  assist: boolean,
  spinAssist: boolean
): PaddleShot {
  const speed = clamp((swipe.distance / swipe.durationMs) * 1.9 * sensitivityMultiplier(sensitivity), 0.25, 1);
  const dirX = clamp((swipe.horizontal / Math.max(48, swipe.distance)) * (assist ? 0.75 : 1), -1, 1);
  const spin = mapSwipeToSpin(swipe.curve, swipe.topComponent, assist, spinAssist);

  return {
    dirX,
    speed,
    spin,
    spinHint: spinHintFromValue(spin)
  };
}

export function spinLabel(spinHint: SpinHint): string {
  if (spinHint === 'top') return 'Topspin';
  if (spinHint === 'back') return 'Backspin';
  return 'No spin';
}
