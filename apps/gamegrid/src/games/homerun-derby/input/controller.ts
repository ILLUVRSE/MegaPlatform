import type { AimLane } from '../types';
import type { ControlScheme } from '../config/tuning';

export interface SwingInput {
  atMs: number;
  aimLane: AimLane;
  swingPlane: number;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startMs: number;
  lastMs: number;
}

export interface BatInputController {
  setScheme: (scheme: ControlScheme) => void;
  setAimTuning: (deadzonePx: number, stepPx: number) => void;
  setSwingCooldown: (ms: number) => void;
  setDragThreshold: (px: number) => void;
  triggerSwing: (nowMs: number) => void;
  pointerDown: (pointerId: number, x: number, y: number, nowMs: number, canSwing: boolean) => void;
  pointerMove: (pointerId: number, x: number, y: number, nowMs: number, allowAimAdjust: boolean) => void;
  pointerUp: (pointerId: number, x: number, y: number, nowMs: number, canSwing: boolean) => void;
  consumeSwing: () => SwingInput | null;
  getAimLane: () => AimLane;
  getSwingPlane: () => number;
  lockAim: () => void;
  clearAimLock: () => void;
  clearDrag: () => void;
  hasActiveDrag: () => boolean;
}

function laneFromDelta(deltaX: number, deadzone: number, step: number): AimLane {
  if (deltaX < -step - deadzone * 0.5) return -1;
  if (deltaX > step + deadzone * 0.5) return 1;
  return 0;
}

function planeFromDelta(deltaY: number, threshold: number): number {
  if (Math.abs(deltaY) < threshold) return 0;
  return Math.max(-1, Math.min(1, -deltaY / 120));
}

export function createBatInputController(): BatInputController {
  let scheme: ControlScheme = 'timing_tap';
  let drag: DragState | null = null;
  let aimLane: AimLane = 0;
  let swingPlane = 0;
  let lockedAimLane: AimLane | null = null;
  let lockedPlane: number | null = null;
  let swingQueued: SwingInput | null = null;
  let lastSwingMs = -Infinity;
  let swingCooldownMs = 120;
  let aimDeadzonePx = 20;
  let aimStepPx = 48;
  let dragThresholdPx = 24;

  const queueSwing = (nowMs: number) => {
    if (nowMs - lastSwingMs < swingCooldownMs) return;
    const lane = lockedAimLane ?? aimLane;
    const plane = lockedPlane ?? swingPlane;
    swingQueued = {
      atMs: nowMs,
      aimLane: lane,
      swingPlane: plane
    };
    lastSwingMs = nowMs;
  };

  return {
    setScheme: (value) => {
      scheme = value;
    },
    setAimTuning: (deadzonePx, stepPx) => {
      aimDeadzonePx = deadzonePx;
      aimStepPx = stepPx;
    },
    setSwingCooldown: (ms) => {
      swingCooldownMs = ms;
    },
    setDragThreshold: (px) => {
      dragThresholdPx = px;
    },
    triggerSwing: (nowMs) => {
      queueSwing(nowMs);
    },
    pointerDown: (pointerId, x, y, nowMs, canSwing) => {
      drag = {
        pointerId,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
        startMs: nowMs,
        lastMs: nowMs
      };
      if (scheme === 'timing_tap' && canSwing) {
        if (lockedAimLane === null) {
          aimLane = laneFromDelta(0, aimDeadzonePx, aimStepPx);
          swingPlane = 0;
        }
        queueSwing(nowMs);
      }
    },
    pointerMove: (pointerId, x, y, nowMs, allowAimAdjust) => {
      if (!drag || drag.pointerId !== pointerId) return;
      drag.currentX = x;
      drag.currentY = y;
      drag.lastMs = nowMs;
      if (!allowAimAdjust || lockedAimLane !== null) return;
      aimLane = laneFromDelta(drag.currentX - drag.startX, aimDeadzonePx, aimStepPx);
      swingPlane = planeFromDelta(drag.currentY - drag.startY, aimDeadzonePx);
    },
    pointerUp: (pointerId, x, y, nowMs, canSwing) => {
      if (!drag || drag.pointerId !== pointerId) return;
      drag.currentX = x;
      drag.currentY = y;
      drag.lastMs = nowMs;

      if (lockedAimLane === null) {
        aimLane = laneFromDelta(drag.currentX - drag.startX, aimDeadzonePx, aimStepPx);
        swingPlane = planeFromDelta(drag.currentY - drag.startY, aimDeadzonePx);
      }

      const horizontalTravel = Math.abs(drag.currentX - drag.startX);
      const verticalTravel = Math.abs(drag.currentY - drag.startY);
      const totalTravel = Math.hypot(horizontalTravel, verticalTravel);

      if (scheme === 'drag_release' && canSwing && totalTravel > dragThresholdPx) {
        queueSwing(nowMs);
      } else if (scheme === 'timing_tap' && canSwing && totalTravel < 20) {
        queueSwing(nowMs);
      }

      drag = null;
    },
    consumeSwing: () => {
      const swing = swingQueued;
      swingQueued = null;
      return swing;
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
