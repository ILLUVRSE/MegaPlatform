import { MINIGOLF_INPUT_TUNING } from './gameplayTheme';
import type { MinigolfHole, MinigolfSensitivity, ShotInput } from './types';

type AimPhase = 'idle' | 'primed' | 'aiming' | 'shotCommitted' | 'cooldown';

interface PointerTrack {
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  filteredDx: number;
  filteredDy: number;
  filteredDrag: number;
}

export interface PreviewLine {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  bounceEndX: number;
  bounceEndY: number;
  impactX: number;
  impactY: number;
  visible: boolean;
}

export interface AimCapture {
  isActive: () => boolean;
  isAiming: () => boolean;
  getPhase: () => AimPhase;
  getAimVector: (out: { x: number; y: number }) => { x: number; y: number };
  tick: (deltaMs: number) => void;
  pointerDown: (pointerId: number, x: number, y: number) => void;
  pointerMove: (pointerId: number, x: number, y: number) => void;
  pointerUp: (pointerId: number, x: number, y: number, assist: boolean, sensitivity: MinigolfSensitivity) => ShotInput | null;
  buildPreview: (
    ballX: number,
    ballY: number,
    hole: MinigolfHole,
    assist: boolean,
    sensitivity: MinigolfSensitivity,
    out: PreviewLine
  ) => void;
  cancel: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sensitivityScale(sensitivity: MinigolfSensitivity): number {
  switch (sensitivity) {
    case 'low':
      return 0.82;
    case 'high':
      return 1;
    default:
      return 0.92;
  }
}

function normalizeAngle(angle: number): number {
  while (angle <= -Math.PI) angle += Math.PI * 2;
  while (angle > Math.PI) angle -= Math.PI * 2;
  return angle;
}

function maybeSnapAngle(angle: number): number {
  const candidates = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, -Math.PI / 4, -Math.PI / 2, (-3 * Math.PI) / 4];
  const tolerance = Math.PI / 28;
  let best = angle;
  let bestDelta = tolerance;
  for (let i = 0; i < candidates.length; i += 1) {
    const delta = Math.abs(normalizeAngle(angle - candidates[i]));
    if (delta < bestDelta) {
      bestDelta = delta;
      best = candidates[i];
    }
  }
  return best;
}

function raySegmentIntersection(
  roX: number,
  roY: number,
  rdX: number,
  rdY: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  out: { t: number; nx: number; ny: number }
): boolean {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const det = rdX * vy - rdY * vx;
  if (Math.abs(det) < 1e-8) return false;

  const qx = x1 - roX;
  const qy = y1 - roY;
  const t = (qx * vy - qy * vx) / det;
  const u = (qx * rdY - qy * rdX) / det;

  if (t <= 0 || u < 0 || u > 1) return false;

  let nx = -vy;
  let ny = vx;
  const len = Math.sqrt(nx * nx + ny * ny) || 1;
  nx /= len;
  ny /= len;

  const facing = nx * rdX + ny * rdY;
  if (facing > 0) {
    nx = -nx;
    ny = -ny;
  }

  out.t = t;
  out.nx = nx;
  out.ny = ny;
  return true;
}

function buildShotFromDrag(dx: number, dy: number, drag: number, assist: boolean, sensitivity: MinigolfSensitivity): ShotInput | null {
  if (drag < MINIGOLF_INPUT_TUNING.deadzonePx) {
    return null;
  }

  let angle = Math.atan2(dy, dx);
  if (assist) {
    angle = maybeSnapAngle(angle);
  }
  const normalizedPower = clamp(drag / MINIGOLF_INPUT_TUNING.maxDragPx, 0, 1);
  const curved = Math.pow(normalizedPower, MINIGOLF_INPUT_TUNING.powerGamma);
  const power = curved * MINIGOLF_INPUT_TUNING.maxShotPower * sensitivityScale(sensitivity);
  return { angle, power };
}

export function createAimCapture(): AimCapture {
  const state: PointerTrack = {
    pointerId: -1,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    filteredDx: 0,
    filteredDy: 0,
    filteredDrag: 0
  };
  let phase: AimPhase = 'idle';
  let cooldownMs = 0;

  return {
    isActive: () => phase === 'primed' || phase === 'aiming',
    isAiming: () => phase === 'aiming',
    getPhase: () => phase,
    getAimVector: (out) => {
      out.x = state.filteredDx;
      out.y = state.filteredDy;
      return out;
    },
    tick: (deltaMs) => {
      if (phase !== 'cooldown') return;
      cooldownMs -= deltaMs;
      if (cooldownMs <= 0) {
        phase = 'idle';
      }
    },
    pointerDown: (pointerId, x, y) => {
      if (phase === 'cooldown') return;
      state.pointerId = pointerId;
      state.startX = x;
      state.startY = y;
      state.currentX = x;
      state.currentY = y;
      state.filteredDx = 0;
      state.filteredDy = 0;
      state.filteredDrag = 0;
      phase = 'primed';
    },
    pointerMove: (pointerId, x, y) => {
      if ((phase !== 'primed' && phase !== 'aiming') || state.pointerId !== pointerId) return;
      state.currentX = x;
      state.currentY = y;
      const rawDx = state.startX - state.currentX;
      const rawDy = state.startY - state.currentY;
      const rawDrag = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
      if (phase === 'primed' && rawDrag >= MINIGOLF_INPUT_TUNING.slopPx) {
        phase = 'aiming';
      }
      if (phase !== 'aiming') return;
      state.filteredDx += (rawDx - state.filteredDx) * MINIGOLF_INPUT_TUNING.angleSmoothing;
      state.filteredDy += (rawDy - state.filteredDy) * MINIGOLF_INPUT_TUNING.angleSmoothing;
      state.filteredDrag += (rawDrag - state.filteredDrag) * MINIGOLF_INPUT_TUNING.powerSmoothing;
    },
    pointerUp: (pointerId, x, y, assist, sensitivity) => {
      if ((phase !== 'primed' && phase !== 'aiming') || state.pointerId !== pointerId) return null;
      state.currentX = x;
      state.currentY = y;
      const rawDx = state.startX - state.currentX;
      const rawDy = state.startY - state.currentY;
      const rawDrag = Math.sqrt(rawDx * rawDx + rawDy * rawDy);

      if (phase === 'aiming') {
        state.filteredDx += (rawDx - state.filteredDx) * 0.5;
        state.filteredDy += (rawDy - state.filteredDy) * 0.5;
        state.filteredDrag += (rawDrag - state.filteredDrag) * 0.5;
      } else {
        state.filteredDx = rawDx;
        state.filteredDy = rawDy;
        state.filteredDrag = rawDrag;
      }

      const shot =
        phase === 'aiming'
          ? buildShotFromDrag(
              state.filteredDx,
              state.filteredDy,
              Math.max(state.filteredDrag, rawDrag),
              assist,
              sensitivity
            )
          : null;
      phase = shot ? 'shotCommitted' : 'idle';
      state.pointerId = -1;
      if (shot) {
        phase = 'cooldown';
        cooldownMs = MINIGOLF_INPUT_TUNING.cooldownMs;
      }
      return shot;
    },
    buildPreview: (ballX, ballY, hole, assist, sensitivity, out) => {
      out.visible = false;
      if (phase !== 'aiming') return;
      const shot = buildShotFromDrag(state.filteredDx, state.filteredDy, state.filteredDrag, assist, sensitivity);
      if (!shot) return;

      const dirX = Math.cos(shot.angle);
      const dirY = Math.sin(shot.angle);
      const hit = { t: Number.POSITIVE_INFINITY, nx: 0, ny: 0 };
      const temp = { t: 0, nx: 0, ny: 0 };

      const bx = hole.bounds.x;
      const by = hole.bounds.y;
      const bw = hole.bounds.width;
      const bh = hole.bounds.height;
      const boundSegs: Array<[number, number, number, number]> = [
        [bx, by, bx + bw, by],
        [bx + bw, by, bx + bw, by + bh],
        [bx + bw, by + bh, bx, by + bh],
        [bx, by + bh, bx, by]
      ];

      for (let i = 0; i < boundSegs.length; i += 1) {
        const seg = boundSegs[i];
        if (raySegmentIntersection(ballX, ballY, dirX, dirY, seg[0], seg[1], seg[2], seg[3], temp) && temp.t < hit.t) {
          hit.t = temp.t;
          hit.nx = temp.nx;
          hit.ny = temp.ny;
        }
      }

      for (let i = 0; i < hole.walls.length; i += 1) {
        const wall = hole.walls[i];
        if (raySegmentIntersection(ballX, ballY, dirX, dirY, wall.x1, wall.y1, wall.x2, wall.y2, temp) && temp.t < hit.t) {
          hit.t = temp.t;
          hit.nx = temp.nx;
          hit.ny = temp.ny;
        }
      }

      if (!Number.isFinite(hit.t)) {
        return;
      }

      const firstLen = Math.min(220, hit.t);
      out.startX = ballX;
      out.startY = ballY;
      out.endX = ballX + dirX * firstLen;
      out.endY = ballY + dirY * firstLen;
      out.impactX = out.endX;
      out.impactY = out.endY;

      const dot = dirX * hit.nx + dirY * hit.ny;
      const bounceX = dirX - 2 * dot * hit.nx;
      const bounceY = dirY - 2 * dot * hit.ny;
      out.bounceEndX = out.endX + bounceX * 100;
      out.bounceEndY = out.endY + bounceY * 100;
      out.visible = true;
    },
    cancel: () => {
      phase = 'idle';
      state.pointerId = -1;
      cooldownMs = 0;
    }
  };
}
