import type { FreethrowSensitivity, ShotInput } from './types';

interface SwipeState {
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startMs: number;
}

interface HoldState {
  pointerId: number;
  startX: number;
  currentX: number;
  startMs: number;
}

export interface SwipeCapture {
  isActive: () => boolean;
  pointerDown: (pointerId: number, x: number, y: number, nowMs: number) => void;
  pointerMove: (pointerId: number, x: number, y: number) => void;
  pointerUp: (pointerId: number, x: number, y: number, meterPhase: number, sensitivity: FreethrowSensitivity) => ShotInput | null;
  getPreview: () => { dx: number; dy: number };
}

export interface HoldReleaseCapture {
  isActive: () => boolean;
  pointerDown: (pointerId: number, x: number, nowMs: number) => void;
  pointerMove: (pointerId: number, x: number) => void;
  pointerUp: (pointerId: number, nowMs: number, meterPhase: number) => ShotInput | null;
  getCharge: (nowMs: number) => number;
  getAim: () => number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sensitivityFactor(value: FreethrowSensitivity): number {
  switch (value) {
    case 'low':
      return 1.2;
    case 'high':
      return 0.82;
    default:
      return 1;
  }
}

export function timingQualityFromMeterPhase(phase: number): number {
  const wrapped = phase - Math.floor(phase);
  const fromCenter = Math.abs(wrapped - 0.5);
  return 1 - fromCenter * 2;
}

export function createSwipeCapture(): SwipeCapture {
  let state: SwipeState | null = null;

  return {
    isActive: () => state !== null,
    pointerDown: (pointerId, x, y, nowMs) => {
      state = {
        pointerId,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
        startMs: nowMs
      };
    },
    pointerMove: (pointerId, x, y) => {
      if (!state || state.pointerId !== pointerId) return;
      state.currentX = x;
      state.currentY = y;
    },
    pointerUp: (pointerId, x, y, meterPhase, sensitivity) => {
      if (!state || state.pointerId !== pointerId) return null;

      const dx = x - state.startX;
      const dy = y - state.startY;
      if (Math.hypot(dx, dy) < 16) {
        state = null;
        return null;
      }

      state = null;

      if (dy > -14) return null;

      const sensitivityScale = sensitivityFactor(sensitivity);
      const power = clamp((-dy / (250 * sensitivityScale)) + (Math.abs(dx) / 700), 0.08, 1);
      const aim = clamp((dx / 220) * sensitivityScale, -1, 1);

      return {
        aim,
        power,
        meterPhase,
        controlScheme: 'arc_swipe'
      };
    },
    getPreview: () => {
      if (!state) return { dx: 0, dy: 0 };
      return {
        dx: state.currentX - state.startX,
        dy: state.currentY - state.startY
      };
    }
  };
}

export function createHoldReleaseCapture(): HoldReleaseCapture {
  let state: HoldState | null = null;

  return {
    isActive: () => state !== null,
    pointerDown: (pointerId, x, nowMs) => {
      state = {
        pointerId,
        startX: x,
        currentX: x,
        startMs: nowMs
      };
    },
    pointerMove: (pointerId, x) => {
      if (!state || state.pointerId !== pointerId) return;
      state.currentX = x;
    },
    pointerUp: (pointerId, nowMs, meterPhase) => {
      if (!state || state.pointerId !== pointerId) return null;

      const heldMs = Math.max(16, nowMs - state.startMs);
      if (heldMs < 90) {
        state = null;
        return null;
      }
      const aim = clamp((state.currentX - state.startX) / 200, -1, 1);
      const power = clamp(heldMs / 1200, 0.08, 1);
      state = null;

      return {
        aim,
        power,
        meterPhase,
        controlScheme: 'hold_release'
      };
    },
    getCharge: (nowMs) => {
      if (!state) return 0;
      return clamp((nowMs - state.startMs) / 1200, 0, 1);
    },
    getAim: () => {
      if (!state) return 0;
      return clamp((state.currentX - state.startX) / 200, -1, 1);
    }
  };
}
