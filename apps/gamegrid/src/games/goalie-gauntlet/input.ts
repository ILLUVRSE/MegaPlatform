import type { GoalieSensitivity, GoalieZone } from './types';

interface DragState {
  pointerId: number;
  active: boolean;
  targetX: number;
  targetY: number;
  lastX: number;
  lastY: number;
}

export interface DragController {
  pointerDown: (pointerId: number, x: number, y: number) => void;
  pointerMove: (pointerId: number, x: number, y: number) => void;
  pointerUp: (pointerId: number) => void;
  update: (currentX: number, currentY: number, dtSec: number, sensitivity: GoalieSensitivity) => { x: number; y: number };
}

export interface TapDiveController {
  zoneAt: (x: number, y: number, width: number, height: number) => GoalieZone;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function speedForSensitivity(sensitivity: GoalieSensitivity): number {
  if (sensitivity === 'low') return 510;
  if (sensitivity === 'high') return 960;
  return 720;
}

function sideFromX(x: number, width: number): 'left' | 'right' {
  return x < width * 0.5 ? 'left' : 'right';
}

function heightBand(y: number, height: number): 'high' | 'mid' | 'low' {
  const normalized = clamp(y / height, 0, 0.999);
  if (normalized < 0.33) return 'high';
  if (normalized < 0.66) return 'mid';
  return 'low';
}

export function zoneFromPointer(x: number, y: number, width: number, height: number): GoalieZone {
  const side = sideFromX(x, width);
  const band = heightBand(y, height);
  return `${band}-${side}` as GoalieZone;
}

export function zoneToGoaliePosition(zone: GoalieZone): { x: number; y: number } {
  const left = zone.endsWith('left');
  const high = zone.startsWith('high');
  const low = zone.startsWith('low');

  return {
    x: left ? 490 : 790,
    y: high ? 500 : low ? 605 : 555
  };
}

export function createDragController(): DragController {
  const state: DragState = {
    pointerId: -1,
    active: false,
    targetX: 640,
    targetY: 560,
    lastX: 640,
    lastY: 560
  };

  return {
    pointerDown: (pointerId, x, y) => {
      state.pointerId = pointerId;
      state.active = true;
      state.targetX = x;
      state.targetY = y;
      state.lastX = x;
      state.lastY = y;
    },
    pointerMove: (pointerId, x, y) => {
      if (!state.active || pointerId !== state.pointerId) return;
      const dx = x - state.lastX;
      const dy = y - state.lastY;
      if (dx * dx + dy * dy < 36) return;
      state.targetX = x;
      state.targetY = y;
      state.lastX = x;
      state.lastY = y;
    },
    pointerUp: (pointerId) => {
      if (pointerId !== state.pointerId) return;
      state.pointerId = -1;
      state.active = false;
    },
    update: (currentX, currentY, dtSec, sensitivity) => {
      const maxStep = speedForSensitivity(sensitivity) * dtSec;
      const dx = clamp(state.targetX - currentX, -maxStep, maxStep);
      const dy = clamp(state.targetY - currentY, -maxStep * 0.42, maxStep * 0.42);
      return {
        x: clamp(currentX + dx, 420, 860),
        y: clamp(currentY + dy, 490, 620)
      };
    }
  };
}

export function createTapDiveController(): TapDiveController {
  return {
    zoneAt: (x, y, width, height) => zoneFromPointer(x, y, width, height)
  };
}
