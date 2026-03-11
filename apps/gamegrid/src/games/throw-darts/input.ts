import { polarToBoardPoint, scoreDartboardHit } from './scoring';
import type { DartHit, ThrowDartsAssistLevel, ThrowDartsOptions, ThrowResolution, SwipeThrowInput } from './types';
import type { ThrowDartsTuning } from './config';

interface SwipeTrackerState {
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startMs: number;
}

export interface SwipeCapture {
  isActive: () => boolean;
  pointerDown: (pointerId: number, x: number, y: number, nowMs: number) => void;
  pointerMove: (pointerId: number, x: number, y: number) => void;
  pointerUp: (pointerId: number, x: number, y: number, nowMs: number, meterPhase: number) => SwipeThrowInput | null;
  getPreviewVector: () => { dx: number; dy: number };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sensitivityFactor(sensitivity: ThrowDartsOptions['sensitivity']): number {
  switch (sensitivity) {
    case 'low':
      return 1.25;
    case 'high':
      return 0.82;
    default:
      return 1;
  }
}

function assistFactor(level: ThrowDartsAssistLevel): number {
  return level === 'low' ? 0.92 : 1;
}

function hitToCenter(hit: DartHit): { radiusNormalized: number; thetaFromTop: number } | null {
  if (hit.ring === 'miss') return null;
  if (hit.isBull) {
    return {
      radiusNormalized: hit.ring === 'inner_bull' ? 4 / 170 : 11 / 170,
      thetaFromTop: 0
    };
  }
  if (!hit.number) return null;
  const order = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  const index = order.indexOf(hit.number);
  if (index < 0) return null;
  const seg = (Math.PI * 2) / 20;
  const thetaFromTop = (index + 0.5) * seg;
  const ringRadius = hit.ring === 'double' ? 166 / 170 : hit.ring === 'triple' ? 103 / 170 : 120 / 170;
  return { radiusNormalized: ringRadius, thetaFromTop };
}

export interface AimSample {
  targetX: number;
  targetY: number;
  power: number;
  spread: number;
}

export interface AimSmoother {
  reset: (x: number, y: number, power: number, nowMs: number) => void;
  update: (x: number, y: number, power: number, nowMs: number) => { x: number; y: number; power: number };
}

export function createAimSmoother(tuning: ThrowDartsTuning): AimSmoother {
  let lastX = 0;
  let lastY = 0;
  let lastPower = 0;
  let lastMs = 0;
  let vx = 0;
  let vy = 0;

  return {
    reset: (x, y, power, nowMs) => {
      lastX = x;
      lastY = y;
      lastPower = power;
      lastMs = nowMs;
      vx = 0;
      vy = 0;
    },
    update: (x, y, power, nowMs) => {
      const dt = Math.max(16, nowMs - lastMs);
      const invDt = 1 / dt;
      vx = (x - lastX) * invDt;
      vy = (y - lastY) * invDt;
      const predict = tuning.aimPredictionMs;
      const predictedX = x + vx * predict;
      const predictedY = y + vy * predict;
      const alpha = tuning.aimSmoothing;
      lastX += (predictedX - lastX) * alpha;
      lastY += (predictedY - lastY) * alpha;
      lastPower += (power - lastPower) * alpha;
      lastMs = nowMs;
      return { x: lastX, y: lastY, power: lastPower };
    }
  };
}

export function computePullbackAim(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  options: ThrowDartsOptions,
  boardCenterX: number,
  boardCenterY: number,
  tuning: ThrowDartsTuning
): AimSample {
  const dx = currentX - startX;
  const dy = currentY - startY;
  const sensitivity = sensitivityFactor(options.sensitivity);
  const power = clamp(dy / (tuning.pullbackPowerScale * sensitivity), 0.12, 1.2);
  const side = dx * 0.85;
  const assist = assistFactor(options.assistLevel);
  const boardX = boardCenterX + side * assist;
  const boardY = boardCenterY + (210 - power * 250);
  const spread = clamp(tuning.randomnessBase + (1 - power) * 0.06, tuning.randomnessMin, tuning.randomnessMax);
  return { targetX: boardX, targetY: boardY, power, spread };
}

export function computeFlickAim(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  durationMs: number,
  options: ThrowDartsOptions,
  boardCenterX: number,
  boardCenterY: number,
  tuning: ThrowDartsTuning
): AimSample {
  const dx = endX - startX;
  const dy = endY - startY;
  const sensitivity = sensitivityFactor(options.sensitivity);
  const time = Math.max(40, durationMs);
  const vx = dx / time;
  const vy = dy / time;
  const speed = Math.hypot(vx, vy);
  const power = clamp((-vy * tuning.flickSpeedScale * sensitivity * 0.9) / 1.4, 0.1, 1.15);
  const side = dx * 0.95 + vx * 80;
  const assist = assistFactor(options.assistLevel);
  const boardX = boardCenterX + side * assist;
  const boardY = boardCenterY + (220 - power * 250) + speed * 6;
  const spread = clamp(tuning.randomnessBase + Math.min(0.1, speed * 0.8), tuning.randomnessMin, tuning.randomnessMax);
  return { targetX: boardX, targetY: boardY, power, spread };
}

export function applyAimAssist(
  targetX: number,
  targetY: number,
  strength: number,
  boardCenterX: number,
  boardCenterY: number,
  boardRadius: number
): { x: number; y: number } {
  if (strength <= 0.001) return { x: targetX, y: targetY };
  const hit = scoreDartboardHit(targetX, targetY, { centerX: boardCenterX, centerY: boardCenterY, radius: boardRadius });
  const center = hitToCenter(hit);
  if (!center) return { x: targetX, y: targetY };
  const snapped = polarToBoardPoint(center.radiusNormalized, center.thetaFromTop, {
    centerX: boardCenterX,
    centerY: boardCenterY,
    radius: boardRadius
  });
  return {
    x: targetX + (snapped.x - targetX) * strength,
    y: targetY + (snapped.y - targetY) * strength
  };
}

export function createSwipeCapture(): SwipeCapture {
  let state: SwipeTrackerState | null = null;

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
    pointerUp: (pointerId, x, y, nowMs, meterPhase) => {
      if (!state || state.pointerId !== pointerId) return null;
      const dx = x - state.startX;
      const dy = y - state.startY;
      if (Math.hypot(dx, dy) < 14) {
        state = null;
        return null;
      }
      const input: SwipeThrowInput = {
        startX: state.startX,
        startY: state.startY,
        endX: x,
        endY: y,
        durationMs: Math.max(16, nowMs - state.startMs),
        meterPhase
      };
      state = null;
      return input;
    },
    getPreviewVector: () => {
      if (!state) {
        return { dx: 0, dy: 0 };
      }
      return {
        dx: state.currentX - state.startX,
        dy: state.currentY - state.startY
      };
    }
  };
}

export function meterToTimingQuality(phase: number): number {
  const wrapped = phase - Math.floor(phase);
  const distance = Math.abs(wrapped - 0.5);
  return 1 - distance * 2;
}

export function resolveThrowFromSwipe(
  swipe: SwipeThrowInput,
  options: ThrowDartsOptions,
  boardCenterX: number,
  boardCenterY: number
): ThrowResolution {
  const dx = swipe.endX - swipe.startX;
  const dy = swipe.endY - swipe.startY;
  const sensitivity = sensitivityFactor(options.sensitivity);

  const upward = clamp((-dy / (220 * sensitivity)), 0.1, 1.15);
  const side = dx * 0.8;

  const timingQuality = options.timingMeter ? meterToTimingQuality(swipe.meterPhase) : 1;
  const timingPenalty = options.timingMeter ? 1 - timingQuality : 0;
  const assist = assistFactor(options.assistLevel);

  const boardX = boardCenterX + side * assist * (1 + timingPenalty * 0.25);
  const boardY = boardCenterY + (210 - upward * 250) * (1 + timingPenalty * 0.2);

  return {
    boardX,
    boardY,
    power: upward,
    timingQuality
  };
}

export function buildSwipeForTarget(
  targetX: number,
  targetY: number,
  options: ThrowDartsOptions,
  boardCenterX: number,
  boardCenterY: number,
  meterPhase: number
): SwipeThrowInput {
  const assist = assistFactor(options.assistLevel);
  const timingQuality = options.timingMeter ? meterToTimingQuality(meterPhase) : 1;
  const timingPenalty = options.timingMeter ? 1 - timingQuality : 0;
  const side = (targetX - boardCenterX) / (assist * (1 + timingPenalty * 0.25));
  const upwardTerm = (targetY - boardCenterY) / (1 + timingPenalty * 0.2);
  const upward = clamp((210 - upwardTerm) / 250, 0.1, 1.15);

  const sensitivity = sensitivityFactor(options.sensitivity);
  const dy = -upward * 220 * sensitivity;
  const dx = side / 0.8;

  return {
    startX: 0,
    startY: 0,
    endX: dx,
    endY: dy,
    durationMs: 140,
    meterPhase
  };
}
