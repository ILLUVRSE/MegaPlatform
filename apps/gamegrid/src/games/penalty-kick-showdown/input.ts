import type { GoalRect, PenaltySensitivity, ShotInput } from './types';

interface SwipeState {
  pointerId: number;
  startX: number;
  startY: number;
  midX: number;
  midY: number;
  endX: number;
  endY: number;
  moved: boolean;
}

export interface SwipeCapture {
  pointerDown: (pointerId: number, x: number, y: number) => void;
  pointerMove: (pointerId: number, x: number, y: number) => void;
  pointerUp: (pointerId: number, x: number, y: number, pressure: number, sensitivity: PenaltySensitivity) => ShotInput | null;
  isActive: () => boolean;
  preview: () => { dx: number; dy: number };
}

export interface TapTargetCapture {
  setTargetFromGoalPoint: (x: number, y: number, goal: GoalRect) => void;
  setPowerFromMeter: (x: number, meterLeft: number, meterWidth: number) => void;
  setSpin: (spin: number) => void;
  getTarget: () => { x: number; y: number };
  getPower: () => number;
  getSpin: () => number;
  buildShot: (pressure: number) => ShotInput;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sensitivityScale(value: PenaltySensitivity): number {
  if (value === 'low') return 1.2;
  if (value === 'high') return 0.82;
  return 1;
}

export function createSwipeCapture(): SwipeCapture {
  let state: SwipeState | null = null;

  return {
    pointerDown: (pointerId, x, y) => {
      state = {
        pointerId,
        startX: x,
        startY: y,
        midX: x,
        midY: y,
        endX: x,
        endY: y,
        moved: false
      };
    },
    pointerMove: (pointerId, x, y) => {
      if (!state || state.pointerId !== pointerId) return;
      if (!state.moved && Math.hypot(x - state.startX, y - state.startY) > 22) {
        state.moved = true;
      }
      state.midX = (state.midX + x) * 0.5;
      state.midY = (state.midY + y) * 0.5;
      state.endX = x;
      state.endY = y;
    },
    pointerUp: (pointerId, x, y, pressure, sensitivity) => {
      if (!state || state.pointerId !== pointerId) return null;
      state.endX = x;
      state.endY = y;

      const dx = state.endX - state.startX;
      const dy = state.endY - state.startY;
      const distance = Math.hypot(dx, dy);
      const verticalTravel = state.startY - state.endY;

      const curveOffset = state.midX - (state.startX + state.endX) * 0.5;
      const sensitivityFactor = sensitivityScale(sensitivity);

      state = null;

      if (distance < 28 || verticalTravel < 14) return null;

      const targetXNorm = clamp(0.5 + dx / (320 * sensitivityFactor), 0, 1);
      const targetYNorm = clamp(verticalTravel / (360 * sensitivityFactor), 0, 1);
      const power = clamp(distance / (380 * sensitivityFactor), 0.1, 1);
      const spin = clamp(dx / 240, -1, 1);
      const curvatureHint = clamp(curveOffset / 120, -1, 1);

      return {
        source: 'swipe',
        targetXNorm,
        targetYNorm,
        power,
        spin,
        curvatureHint,
        pressure: clamp(pressure, 0, 1)
      };
    },
    isActive: () => state !== null,
    preview: () => {
      if (!state) return { dx: 0, dy: 0 };
      return {
        dx: state.endX - state.startX,
        dy: state.endY - state.startY
      };
    }
  };
}

export function createTapTargetCapture(): TapTargetCapture {
  let targetX = 0.5;
  let targetY = 0.42;
  let power = 0.62;
  let spin = 0;

  return {
    setTargetFromGoalPoint: (x, y, goal) => {
      const safeX = clamp((x - goal.left) / (goal.right - goal.left), 0, 1);
      const safeY = clamp((goal.bottom - y) / (goal.bottom - goal.top), 0, 1);
      targetX = safeX;
      targetY = safeY;
    },
    setPowerFromMeter: (x, meterLeft, meterWidth) => {
      power = clamp((x - meterLeft) / meterWidth, 0.1, 1);
    },
    setSpin: (value) => {
      spin = clamp(value, -1, 1);
    },
    getTarget: () => ({ x: targetX, y: targetY }),
    getPower: () => power,
    getSpin: () => spin,
    buildShot: (pressure) => ({
      source: 'tap_target',
      targetXNorm: targetX,
      targetYNorm: targetY,
      power,
      spin,
      curvatureHint: 0,
      pressure: clamp(pressure, 0, 1)
    })
  };
}
