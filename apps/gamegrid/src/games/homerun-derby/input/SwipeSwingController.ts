import { clamp } from '../config/tuning';
import { GAME_CONFIG } from '../config/gameConfig';
import type { AimLane } from '../types';

export interface SwipePoint {
  x: number;
  y: number;
  t: number;
}

export interface SwipeMetrics {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  vectorX: number;
  vectorY: number;
  angleRad: number;
  speedPxPerMs: number;
  quality: number;
  distancePx: number;
  durationMs: number;
  endMs: number;
  swingPeakMs: number;
  aimLane: AimLane;
  swingPlane: number;
  path: SwipePoint[];
}

export interface SwipeSwingInput {
  atMs: number;
  aimLane: AimLane;
  swingPlane: number;
  swipe: SwipeMetrics;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startMs: number;
  lastMs: number;
  count: number;
  xs: number[];
  ys: number[];
  ts: number[];
}

export interface SwipeSwingController {
  setZone: (x: number, y: number, width: number, height: number) => void;
  setSwingCooldown: (ms: number) => void;
  setDragThreshold: (px: number) => void;
  setAimTuning: (_deadzonePx: number, _stepPx: number) => void;
  setScheme: (_scheme: string) => void;
  triggerSwing: (_nowMs: number) => void;
  pointerDown: (pointerId: number, x: number, y: number, nowMs: number, canSwing: boolean) => void;
  pointerMove: (pointerId: number, x: number, y: number, nowMs: number, _allowAimAdjust: boolean) => void;
  pointerUp: (pointerId: number, x: number, y: number, nowMs: number, canSwing: boolean) => void;
  consumeSwing: () => SwipeSwingInput | null;
  getAimLane: () => AimLane;
  getSwingPlane: () => number;
  lockAim: () => void;
  clearAimLock: () => void;
  clearDrag: () => void;
  hasActiveDrag: () => boolean;
}

function laneFromAngle(angleRad: number): AimLane {
  const x = Math.cos(angleRad);
  if (x < -0.22) return -1;
  if (x > 0.22) return 1;
  return 0;
}

function planeFromVector(vy: number): number {
  return clamp(-vy / 150, -1, 1);
}

function normalizeSpeed(speed: number): number {
  const cfg = GAME_CONFIG.swipe;
  const t = clamp((speed - cfg.speedNormMin) / Math.max(0.001, cfg.speedNormMax - cfg.speedNormMin), 0, 1);
  return t ** cfg.speedCurvePower;
}

export function createSwipeSwingController(): SwipeSwingController {
  const cfg = GAME_CONFIG.swipe;
  let zoneX = 0;
  let zoneY = 0;
  let zoneW = 1280;
  let zoneH = 720;

  let drag: DragState | null = null;
  let queued: SwipeSwingInput | null = null;
  let lastSwingMs = -Infinity;
  let swingCooldownMs = 100;
  let dragThresholdPx = cfg.minDistancePx;
  let aimLane: AimLane = 0;
  let swingPlane = 0;
  let lockedAimLane: AimLane | null = null;
  let lockedPlane: number | null = null;

  const insideZone = (x: number, y: number) =>
    x >= zoneX - cfg.zonePadPx && x <= zoneX + zoneW + cfg.zonePadPx && y >= zoneY - cfg.zonePadPx && y <= zoneY + zoneH + cfg.zonePadPx;

  const finalize = (state: DragState, endX: number, endY: number, endMs: number): SwipeSwingInput | null => {
    const durationMs = Math.max(cfg.minDurationMs, endMs - state.startMs);
    const vectorX = endX - state.startX;
    const vectorY = endY - state.startY;
    const distancePx = Math.hypot(vectorX, vectorY);

    if (durationMs > cfg.maxDurationMs || distancePx < dragThresholdPx) return null;

    const speedPxPerMs = distancePx / durationMs;
    const angleRad = Math.atan2(vectorY, vectorX);
    const swipeAimLane = laneFromAngle(angleRad);
    const swipeSwingPlane = planeFromVector(vectorY);
    aimLane = swipeAimLane;
    swingPlane = swipeSwingPlane;

    const path: SwipePoint[] = [];
    const step = Math.max(1, Math.floor(state.count / Math.max(1, cfg.replayPathMaxPoints - 1)));
    for (let i = 0; i < state.count; i += step) {
      path.push({ x: state.xs[i], y: state.ys[i], t: state.ts[i] });
      if (path.length >= cfg.replayPathMaxPoints) break;
    }
    path.push({ x: endX, y: endY, t: endMs });

    const swipe: SwipeMetrics = {
      startX: state.startX,
      startY: state.startY,
      endX,
      endY,
      vectorX,
      vectorY,
      angleRad,
      speedPxPerMs,
      quality: normalizeSpeed(speedPxPerMs),
      distancePx,
      durationMs,
      endMs,
      swingPeakMs: endMs + cfg.swingPeakOffsetMs,
      aimLane: lockedAimLane ?? swipeAimLane,
      swingPlane: lockedPlane ?? swipeSwingPlane,
      path
    };

    return {
      atMs: swipe.swingPeakMs,
      aimLane: swipe.aimLane,
      swingPlane: swipe.swingPlane,
      swipe
    };
  };

  return {
    setZone: (x, y, width, height) => {
      zoneX = x;
      zoneY = y;
      zoneW = width;
      zoneH = height;
    },
    setSwingCooldown: (ms) => {
      swingCooldownMs = ms;
    },
    setDragThreshold: (px) => {
      dragThresholdPx = Math.max(4, px);
    },
    setAimTuning: () => {
      // Swipe controls compute aim from gesture angle.
    },
    setScheme: () => {
      // Swipe is always the active scheme.
    },
    triggerSwing: () => {
      // No tap trigger in swipe mode.
    },
    pointerDown: (pointerId, x, y, nowMs, canSwing) => {
      if (!canSwing || !insideZone(x, y)) return;
      drag = {
        pointerId,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
        startMs: nowMs,
        lastMs: nowMs,
        count: 1,
        xs: [x],
        ys: [y],
        ts: [nowMs]
      };
    },
    pointerMove: (pointerId, x, y, nowMs) => {
      if (!drag || drag.pointerId !== pointerId) return;
      drag.currentX = x;
      drag.currentY = y;
      drag.lastMs = nowMs;
      drag.xs.push(x);
      drag.ys.push(y);
      drag.ts.push(nowMs);
      drag.count += 1;
      aimLane = laneFromAngle(Math.atan2(drag.currentY - drag.startY, drag.currentX - drag.startX));
      swingPlane = planeFromVector(drag.currentY - drag.startY);
    },
    pointerUp: (pointerId, x, y, nowMs, canSwing) => {
      if (!drag || drag.pointerId !== pointerId) return;
      if (!canSwing || nowMs - lastSwingMs < swingCooldownMs) {
        drag = null;
        return;
      }
      const swing = finalize(drag, x, y, nowMs);
      drag = null;
      if (!swing) return;
      lastSwingMs = nowMs;
      queued = swing;
    },
    consumeSwing: () => {
      const out = queued;
      queued = null;
      return out;
    },
    getAimLane: () => lockedAimLane ?? aimLane,
    getSwingPlane: () => lockedPlane ?? swingPlane,
    lockAim: () => {
      lockedAimLane = aimLane;
      lockedPlane = swingPlane;
    },
    clearAimLock: () => {
      lockedAimLane = null;
      lockedPlane = null;
    },
    clearDrag: () => {
      drag = null;
    },
    hasActiveDrag: () => Boolean(drag)
  };
}
