import type { InputState, RodState } from './types';
import { findClosestRodIndexByX } from './rods';

interface PointerSample {
  id: number;
  x: number;
  y: number;
  timeMs: number;
}

interface InputHandlers {
  onSelectRod: (rodIndex: number, nowMs: number) => void;
  onDragRod: (deltaY: number) => void;
  onKick: (strength: number) => void;
}

const TAP_MAX_DIST = 18;
const TAP_MAX_MS = 240;
const FLICK_MIN_SPEED = 0.65;
const DRAG_DEADZONE = 0.8;

export function createInputState(): InputState {
  return {
    activePointerId: null,
    downX: 0,
    downY: 0,
    lastX: 0,
    lastY: 0,
    downTimeMs: 0,
    dragging: false
  };
}

export function onPointerDown(state: InputState, sample: PointerSample, rods: readonly RodState[], handlers: InputHandlers): void {
  if (state.activePointerId !== null) return;
  state.activePointerId = sample.id;
  state.downX = sample.x;
  state.downY = sample.y;
  state.lastX = sample.x;
  state.lastY = sample.y;
  state.downTimeMs = sample.timeMs;
  state.dragging = false;

  const rodIndex = findClosestRodIndexByX(rods, sample.x);
  if (rodIndex !== null) {
    handlers.onSelectRod(rodIndex, sample.timeMs);
  }
}

export function onPointerMove(state: InputState, sample: PointerSample, handlers: InputHandlers): void {
  if (state.activePointerId !== sample.id) return;
  const deltaY = sample.y - state.lastY;
  if (Math.abs(sample.y - state.downY) > 6) {
    state.dragging = true;
  }
  state.lastX = sample.x;
  state.lastY = sample.y;

  if (Math.abs(deltaY) > DRAG_DEADZONE) {
    handlers.onDragRod(deltaY);
  }
}

export function onPointerUp(state: InputState, sample: PointerSample, handlers: InputHandlers): void {
  if (state.activePointerId !== sample.id) return;

  const dx = sample.x - state.downX;
  const dy = sample.y - state.downY;
  const elapsedMs = Math.max(1, sample.timeMs - state.downTimeMs);
  const speed = Math.abs(dy) / elapsedMs;

  let strength = 1;
  if (speed >= FLICK_MIN_SPEED) {
    strength = Math.min(2.1, 1 + speed * 1.1);
  }

  const isTap = Math.hypot(dx, dy) <= TAP_MAX_DIST && elapsedMs <= TAP_MAX_MS;
  if (isTap || state.dragging || speed >= FLICK_MIN_SPEED * 0.85) {
    handlers.onKick(strength);
  }

  state.activePointerId = null;
  state.dragging = false;
}
