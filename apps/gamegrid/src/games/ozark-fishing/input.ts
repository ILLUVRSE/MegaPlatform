export interface SwipeState {
  active: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startMs: number;
  endMs: number;
}

export interface SwipeSnapshot {
  dx: number;
  dy: number;
  distance: number;
  durationMs: number;
}

export function createSwipeState(): SwipeState {
  return {
    active: false,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    startMs: 0,
    endMs: 0
  };
}

export function beginSwipe(state: SwipeState, x: number, y: number, nowMs: number): void {
  state.active = true;
  state.startX = x;
  state.startY = y;
  state.endX = x;
  state.endY = y;
  state.startMs = nowMs;
  state.endMs = nowMs;
}

export function moveSwipe(state: SwipeState, x: number, y: number, nowMs: number): void {
  if (!state.active) return;
  state.endX = x;
  state.endY = y;
  state.endMs = nowMs;
}

export function finishSwipe(state: SwipeState, x: number, y: number, nowMs: number): SwipeSnapshot | null {
  if (!state.active) return null;
  state.active = false;
  state.endX = x;
  state.endY = y;
  state.endMs = nowMs;

  const dx = state.endX - state.startX;
  const dy = state.endY - state.startY;
  const distance = Math.hypot(dx, dy);
  const durationMs = Math.max(1, state.endMs - state.startMs);

  return {
    dx,
    dy,
    distance,
    durationMs
  };
}
