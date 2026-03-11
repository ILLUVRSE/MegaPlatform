export interface PointerInputOptions {
  deadzonePx?: number;
  smoothing?: number;
  sensitivity?: number;
  capture?: boolean;
  preventDefault?: boolean;
  transform?: (clientX: number, clientY: number) => { x: number; y: number };
  onStart?: (state: PointerInputState) => void;
  onMove?: (state: PointerInputState) => void;
  onEnd?: (state: PointerInputState) => void;
}

export interface PointerInputState {
  active: boolean;
  id: number | null;
  startX: number;
  startY: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  rawDx: number;
  rawDy: number;
  totalDx: number;
  totalDy: number;
  vx: number;
  vy: number;
  timestamp: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function createPointerInput(target: HTMLElement, options: PointerInputOptions = {}) {
  const state: PointerInputState = {
    active: false,
    id: null,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    rawDx: 0,
    rawDy: 0,
    totalDx: 0,
    totalDy: 0,
    vx: 0,
    vy: 0,
    timestamp: 0
  };

  const deadzone = Math.max(0, options.deadzonePx ?? 4);
  const smoothing = clamp(options.smoothing ?? 0.15, 0, 0.9);
  const sensitivity = options.sensitivity ?? 1;
  const transform = options.transform ?? ((x, y) => ({ x, y }));

  let lastX = 0;
  let lastY = 0;
  let lastTime = 0;
  let enabled = true;

  const applyUpdate = (clientX: number, clientY: number) => {
    const now = performance.now();
    const mapped = transform(clientX, clientY);
    const rawDx = (mapped.x - lastX) * sensitivity;
    const rawDy = (mapped.y - lastY) * sensitivity;
    const totalDx = (mapped.x - state.startX) * sensitivity;
    const totalDy = (mapped.y - state.startY) * sensitivity;
    const dt = Math.max(1, now - lastTime);

    state.rawDx = rawDx;
    state.rawDy = rawDy;
    state.totalDx = totalDx;
    state.totalDy = totalDy;

    const distance = Math.hypot(totalDx, totalDy);
    const alpha = 1 - smoothing;
    const nextDx = distance < deadzone ? 0 : rawDx;
    const nextDy = distance < deadzone ? 0 : rawDy;

    state.dx = state.dx + (nextDx - state.dx) * alpha;
    state.dy = state.dy + (nextDy - state.dy) * alpha;
    state.vx = state.vx + ((state.dx / dt) * 1000 - state.vx) * alpha;
    state.vy = state.vy + ((state.dy / dt) * 1000 - state.vy) * alpha;

    state.x = distance < deadzone ? state.startX : mapped.x;
    state.y = distance < deadzone ? state.startY : mapped.y;
    state.timestamp = now;

    lastX = mapped.x;
    lastY = mapped.y;
    lastTime = now;
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (!enabled || state.active) return;
    if (options.preventDefault) event.preventDefault();
    state.active = true;
    state.id = event.pointerId;
    const mapped = transform(event.clientX, event.clientY);
    state.startX = mapped.x;
    state.startY = mapped.y;
    state.x = mapped.x;
    state.y = mapped.y;
    state.dx = 0;
    state.dy = 0;
    state.rawDx = 0;
    state.rawDy = 0;
    state.totalDx = 0;
    state.totalDy = 0;
    state.vx = 0;
    state.vy = 0;
    lastX = mapped.x;
    lastY = mapped.y;
    lastTime = performance.now();
    if (options.capture && target.setPointerCapture) {
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        // Ignore capture errors for browsers that disallow it.
      }
    }
    options.onStart?.(state);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!enabled || !state.active || event.pointerId !== state.id) return;
    if (options.preventDefault) event.preventDefault();
    applyUpdate(event.clientX, event.clientY);
    options.onMove?.(state);
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (!state.active || event.pointerId !== state.id) return;
    if (options.preventDefault) event.preventDefault();
    applyUpdate(event.clientX, event.clientY);
    state.active = false;
    if (options.capture && target.releasePointerCapture) {
      try {
        target.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore capture errors for browsers that disallow it.
      }
    }
    state.id = null;
    options.onEnd?.(state);
  };

  target.addEventListener('pointerdown', handlePointerDown, { passive: !options.preventDefault });
  target.addEventListener('pointermove', handlePointerMove, { passive: !options.preventDefault });
  target.addEventListener('pointerup', handlePointerUp, { passive: !options.preventDefault });
  target.addEventListener('pointercancel', handlePointerUp, { passive: !options.preventDefault });

  return {
    state,
    setEnabled(value: boolean) {
      enabled = value;
    },
    reset() {
      state.active = false;
      state.id = null;
      state.dx = 0;
      state.dy = 0;
      state.rawDx = 0;
      state.rawDy = 0;
      state.totalDx = 0;
      state.totalDy = 0;
      state.vx = 0;
      state.vy = 0;
    },
    destroy() {
      target.removeEventListener('pointerdown', handlePointerDown);
      target.removeEventListener('pointermove', handlePointerMove);
      target.removeEventListener('pointerup', handlePointerUp);
      target.removeEventListener('pointercancel', handlePointerUp);
    }
  };
}
