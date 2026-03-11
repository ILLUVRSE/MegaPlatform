import type { PaddleState, PuckState, RinkGeometry, RinkObstacle } from './types';

export interface PixelPuckPhysicsSettings {
  maxSpeed: number;
  friction: number;
  railRestitution: number;
  paddleRestitution: number;
  smashBoost: number;
  spinFactor: number;
  maxSpin: number;
  maxIterations: number;
}

export interface PhysicsImpact {
  kind: 'paddle' | 'rail' | 'obstacle';
  x: number;
  y: number;
  strength: number;
  smash?: boolean;
}

export interface PhysicsScratch {
  impacts: PhysicsImpact[];
  goal: 'top' | 'bottom' | null;
}

export function createPhysicsScratch(): PhysicsScratch {
  return { impacts: [], goal: null };
}

export const DEFAULT_PHYSICS: PixelPuckPhysicsSettings = {
  maxSpeed: 1750,
  friction: 0.18,
  railRestitution: 0.96,
  paddleRestitution: 1.08,
  smashBoost: 1.25,
  spinFactor: 0.32,
  maxSpin: 280,
  maxIterations: 6
};

const EPS = 0.0001;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalize(dx: number, dy: number) {
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function sweepCircleVsCircle(
  cx: number,
  cy: number,
  rvx: number,
  rvy: number,
  radius: number,
  maxTime: number
) {
  const a = rvx * rvx + rvy * rvy;
  if (a < EPS) return null;
  const b = 2 * (cx * rvx + cy * rvy);
  const c = cx * cx + cy * cy - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sqrt = Math.sqrt(disc);
  const t = (-b - sqrt) / (2 * a);
  if (t < 0 || t > maxTime) return null;
  return t;
}

function sweepPointAabb(px: number, py: number, vx: number, vy: number, left: number, right: number, top: number, bottom: number, maxTime: number) {
  let tMin = 0;
  let tMax = maxTime;
  let nx = 0;
  let ny = 0;

  if (Math.abs(vx) < EPS) {
    if (px < left || px > right) return null;
  } else {
    const inv = 1 / vx;
    let t1 = (left - px) * inv;
    let t2 = (right - px) * inv;
    let n = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      n = 1;
    }
    if (t1 > tMin) {
      tMin = t1;
      nx = n;
      ny = 0;
    }
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }

  if (Math.abs(vy) < EPS) {
    if (py < top || py > bottom) return null;
  } else {
    const inv = 1 / vy;
    let t1 = (top - py) * inv;
    let t2 = (bottom - py) * inv;
    let n = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      n = 1;
    }
    if (t1 > tMin) {
      tMin = t1;
      nx = 0;
      ny = n;
    }
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }

  if (tMin < 0 || tMin > maxTime) return null;
  return { t: tMin, nx, ny };
}

function pushImpact(scratch: PhysicsScratch, kind: PhysicsImpact['kind'], x: number, y: number, strength: number, smash?: boolean) {
  const impacts = scratch.impacts;
  const idx = impacts.length;
  if (idx > 31) return;
  impacts.push({ kind, x, y, strength, smash });
}

function applyPaddleResponse(puck: PuckState, paddle: PaddleState, nx: number, ny: number, settings: PixelPuckPhysicsSettings, smash: boolean) {
  const relVx = puck.vx - paddle.vx;
  const relVy = puck.vy - paddle.vy;
  const alongNormal = relVx * nx + relVy * ny;
  if (alongNormal >= 0) return;
  const boost = smash ? settings.smashBoost : 1;
  const impulse = -(1 + settings.paddleRestitution * boost) * alongNormal;
  puck.vx += nx * impulse + paddle.vx * 0.18;
  puck.vy += ny * impulse + paddle.vy * 0.18;

  const tangentX = -ny;
  const tangentY = nx;
  const spin = clamp(relVx * tangentX + relVy * tangentY, -settings.maxSpin, settings.maxSpin);
  puck.vx += tangentX * spin * settings.spinFactor;
  puck.vy += tangentY * spin * settings.spinFactor;
}

function clampSpeed(puck: PuckState, maxSpeed: number) {
  const speed = Math.hypot(puck.vx, puck.vy);
  if (speed > maxSpeed) {
    const inv = maxSpeed / speed;
    puck.vx *= inv;
    puck.vy *= inv;
  }
}

function resolveOverlap(puck: PuckState, paddle: PaddleState) {
  const dx = puck.x - paddle.x;
  const dy = puck.y - paddle.y;
  const minDist = puck.radius + paddle.radius;
  const distSq = dx * dx + dy * dy;
  if (distSq <= 0 || distSq >= minDist * minDist) return;
  const dist = Math.sqrt(distSq);
  const overlap = minDist - dist;
  const nx = dx / dist;
  const ny = dy / dist;
  puck.x += nx * overlap;
  puck.y += ny * overlap;
}

function resolveObstacleOverlap(puck: PuckState, obstacle: RinkObstacle) {
  if (obstacle.kind === 'circle') {
    const dx = puck.x - obstacle.x;
    const dy = puck.y - obstacle.y;
    const minDist = puck.radius + obstacle.radius;
    const distSq = dx * dx + dy * dy;
    if (distSq <= 0 || distSq >= minDist * minDist) return;
    const dist = Math.sqrt(distSq);
    const overlap = minDist - dist;
    const nx = dx / dist;
    const ny = dy / dist;
    puck.x += nx * overlap;
    puck.y += ny * overlap;
    return;
  }

  const left = obstacle.x - puck.radius;
  const right = obstacle.x + obstacle.width + puck.radius;
  const top = obstacle.y - puck.radius;
  const bottom = obstacle.y + obstacle.height + puck.radius;
  if (puck.x < left || puck.x > right || puck.y < top || puck.y > bottom) return;
  const dxLeft = Math.abs(puck.x - left);
  const dxRight = Math.abs(right - puck.x);
  const dyTop = Math.abs(puck.y - top);
  const dyBottom = Math.abs(bottom - puck.y);
  const min = Math.min(dxLeft, dxRight, dyTop, dyBottom);
  if (min === dxLeft) puck.x = left;
  else if (min === dxRight) puck.x = right;
  else if (min === dyTop) puck.y = top;
  else puck.y = bottom;
}

function computeGoalCandidate(
  puck: PuckState,
  rink: RinkGeometry,
  maxTime: number
) {
  if (puck.vy < -EPS) {
    const lineY = rink.goals.top.lineY;
    const t = (lineY - puck.radius - puck.y) / puck.vy;
    if (t >= 0 && t <= maxTime) {
      const xAt = puck.x + puck.vx * t;
      if (xAt >= rink.goals.top.x && xAt <= rink.goals.top.x + rink.goals.top.width) {
        return { t, scorer: 'bottom' as const, x: xAt, y: lineY - puck.radius };
      }
    }
  }
  if (puck.vy > EPS) {
    const lineY = rink.goals.bottom.lineY;
    const t = (lineY + puck.radius - puck.y) / puck.vy;
    if (t >= 0 && t <= maxTime) {
      const xAt = puck.x + puck.vx * t;
      if (xAt >= rink.goals.bottom.x && xAt <= rink.goals.bottom.x + rink.goals.bottom.width) {
        return { t, scorer: 'top' as const, x: xAt, y: lineY + puck.radius };
      }
    }
  }
  return null;
}

export function stepPixelPuckPhysics(
  puck: PuckState,
  paddles: { bottom: PaddleState; top: PaddleState },
  rink: RinkGeometry,
  dt: number,
  settings: PixelPuckPhysicsSettings,
  scratch: PhysicsScratch,
  smashBottom: boolean
) {
  scratch.goal = null;
  scratch.impacts.length = 0;

  resolveOverlap(puck, paddles.bottom);
  resolveOverlap(puck, paddles.top);
  for (let i = 0; i < rink.obstacles.length; i += 1) {
    resolveObstacleOverlap(puck, rink.obstacles[i]);
  }

  let remaining = dt;
  let iterations = 0;

  while (remaining > EPS && iterations < settings.maxIterations) {
    iterations += 1;

    const goal = computeGoalCandidate(puck, rink, remaining);

    let hitT = remaining + 1;
    let hitNx = 0;
    let hitNy = 0;
    let hitType: PhysicsImpact['kind'] | 'goal' | 'none' = 'none';
    let hitPaddle: PaddleState | null = null;
    let hitSmash = false;

    if (goal && goal.t < hitT) {
      hitT = goal.t;
      hitType = 'goal';
    }

    if (puck.vx < -EPS) {
      const t = (rink.bounds.x + puck.radius - puck.x) / puck.vx;
      if (t >= 0 && t < hitT && t <= remaining) {
        hitT = t;
        hitType = 'rail';
        hitNx = 1;
        hitNy = 0;
      }
    } else if (puck.vx > EPS) {
      const t = (rink.bounds.x + rink.bounds.width - puck.radius - puck.x) / puck.vx;
      if (t >= 0 && t < hitT && t <= remaining) {
        hitT = t;
        hitType = 'rail';
        hitNx = -1;
        hitNy = 0;
      }
    }

    if (puck.vy < -EPS) {
      const t = (rink.bounds.y + puck.radius - puck.y) / puck.vy;
      if (t >= 0 && t < hitT && t <= remaining) {
        const xAt = puck.x + puck.vx * t;
        const inGoal = xAt >= rink.goals.top.x && xAt <= rink.goals.top.x + rink.goals.top.width;
        if (!inGoal) {
          hitT = t;
          hitType = 'rail';
          hitNx = 0;
          hitNy = 1;
        }
      }
    } else if (puck.vy > EPS) {
      const t = (rink.bounds.y + rink.bounds.height - puck.radius - puck.y) / puck.vy;
      if (t >= 0 && t < hitT && t <= remaining) {
        const xAt = puck.x + puck.vx * t;
        const inGoal = xAt >= rink.goals.bottom.x && xAt <= rink.goals.bottom.x + rink.goals.bottom.width;
        if (!inGoal) {
          hitT = t;
          hitType = 'rail';
          hitNx = 0;
          hitNy = -1;
        }
      }
    }

    const relBottom = sweepCircleVsCircle(
      puck.x - paddles.bottom.x,
      puck.y - paddles.bottom.y,
      puck.vx - paddles.bottom.vx,
      puck.vy - paddles.bottom.vy,
      puck.radius + paddles.bottom.radius,
      remaining
    );
    if (relBottom !== null && relBottom < hitT) {
      hitT = relBottom;
      hitType = 'paddle';
      hitPaddle = paddles.bottom;
      hitSmash = smashBottom;
    }

    const relTop = sweepCircleVsCircle(
      puck.x - paddles.top.x,
      puck.y - paddles.top.y,
      puck.vx - paddles.top.vx,
      puck.vy - paddles.top.vy,
      puck.radius + paddles.top.radius,
      remaining
    );
    if (relTop !== null && relTop < hitT) {
      hitT = relTop;
      hitType = 'paddle';
      hitPaddle = paddles.top;
      hitSmash = false;
    }

    for (let i = 0; i < rink.obstacles.length; i += 1) {
      const obstacle = rink.obstacles[i];
      if (obstacle.kind === 'circle') {
        const t = sweepCircleVsCircle(
          puck.x - obstacle.x,
          puck.y - obstacle.y,
          puck.vx,
          puck.vy,
          puck.radius + obstacle.radius,
          remaining
        );
        if (t !== null && t < hitT) {
          hitT = t;
          hitType = 'obstacle';
          const cx = puck.x + puck.vx * t - obstacle.x;
          const cy = puck.y + puck.vy * t - obstacle.y;
          const n = normalize(cx, cy);
          hitNx = n.x;
          hitNy = n.y;
        }
      } else {
        const left = obstacle.x - puck.radius;
        const right = obstacle.x + obstacle.width + puck.radius;
        const top = obstacle.y - puck.radius;
        const bottom = obstacle.y + obstacle.height + puck.radius;
        const result = sweepPointAabb(puck.x, puck.y, puck.vx, puck.vy, left, right, top, bottom, remaining);
        if (result && result.t < hitT) {
          hitT = result.t;
          hitType = 'obstacle';
          hitNx = result.nx;
          hitNy = result.ny;
        }
      }
    }

    if (hitType === 'none' || hitT > remaining) {
      puck.x += puck.vx * remaining;
      puck.y += puck.vy * remaining;
      remaining = 0;
      break;
    }

    puck.x += puck.vx * hitT;
    puck.y += puck.vy * hitT;
    remaining -= hitT;

    if (hitType === 'goal') {
      if (goal) {
        scratch.goal = goal.scorer;
        puck.x = goal.x;
        puck.y = goal.y;
      }
      break;
    }

    if (hitType === 'rail') {
      const rel = puck.vx * hitNx + puck.vy * hitNy;
      if (rel < 0) {
        puck.vx -= rel * hitNx * (1 + settings.railRestitution);
        puck.vy -= rel * hitNy * (1 + settings.railRestitution);
      }
      pushImpact(scratch, 'rail', puck.x, puck.y, Math.min(1, Math.abs(rel) / 1200));
    } else if (hitType === 'paddle' && hitPaddle) {
      const cx = puck.x - hitPaddle.x;
      const cy = puck.y - hitPaddle.y;
      const n = normalize(cx, cy);
      applyPaddleResponse(puck, hitPaddle, n.x, n.y, settings, hitSmash);
      pushImpact(scratch, 'paddle', puck.x, puck.y, Math.min(1, Math.hypot(puck.vx, puck.vy) / 1600), hitSmash);
    } else if (hitType === 'obstacle') {
      const rel = puck.vx * hitNx + puck.vy * hitNy;
      if (rel < 0) {
        puck.vx -= rel * hitNx * (1 + settings.railRestitution);
        puck.vy -= rel * hitNy * (1 + settings.railRestitution);
      }
      pushImpact(scratch, 'obstacle', puck.x, puck.y, Math.min(1, Math.abs(rel) / 1200));
    }
  }

  const drag = Math.max(0, 1 - settings.friction * dt);
  puck.vx *= drag;
  puck.vy *= drag;
  clampSpeed(puck, settings.maxSpeed);
}
