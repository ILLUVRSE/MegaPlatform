import type { PhysicsStepResult, PhysicsStepScratch, PoolBall, TableGeometry, Vec2 } from './types';

const DEFAULT_MAX_SUBSTEPS = 6;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lenSq(x: number, y: number): number {
  return x * x + y * y;
}

function normalize(out: Vec2, x: number, y: number): Vec2 {
  const m = Math.hypot(x, y);
  if (m < 1e-6) {
    out.x = 1;
    out.y = 0;
    return out;
  }
  out.x = x / m;
  out.y = y / m;
  return out;
}

export function createPoolTableGeometry(): TableGeometry {
  const left = 110;
  const right = 1170;
  const top = 90;
  const bottom = 630;

  return {
    bounds: { left, right, top, bottom },
    ballRadius: 14,
    pocketCaptureRadius: 24,
    railRestitution: 0.92,
    ballRestitution: 0.97,
    friction: 0.52,
    sleepSpeed: 8,
    pockets: [
      { id: 'TL', x: left, y: top, radius: 28 },
      { id: 'TM', x: (left + right) * 0.5, y: top, radius: 24 },
      { id: 'TR', x: right, y: top, radius: 28 },
      { id: 'BL', x: left, y: bottom, radius: 28 },
      { id: 'BM', x: (left + right) * 0.5, y: bottom, radius: 24 },
      { id: 'BR', x: right, y: bottom, radius: 28 }
    ]
  };
}

export function createPhysicsScratch(): PhysicsStepScratch {
  return { maxSubSteps: DEFAULT_MAX_SUBSTEPS };
}

export function anyBallMoving(balls: PoolBall[], threshold: number): boolean {
  for (let i = 0; i < balls.length; i += 1) {
    const b = balls[i];
    if (b.pocketed) continue;
    if (lenSq(b.vx, b.vy) > threshold * threshold) return true;
  }
  return false;
}

export function placeCueBall(
  cue: PoolBall,
  x: number,
  y: number,
  balls: PoolBall[],
  table: TableGeometry,
  restrictToKitchen: boolean
): boolean {
  const minX = restrictToKitchen ? table.bounds.left + table.ballRadius : table.bounds.left + table.ballRadius;
  const maxX = restrictToKitchen
    ? table.bounds.left + (table.bounds.right - table.bounds.left) * 0.52
    : table.bounds.right - table.ballRadius;
  const minY = table.bounds.top + table.ballRadius;
  const maxY = table.bounds.bottom - table.ballRadius;

  cue.x = clamp(x, minX, maxX);
  cue.y = clamp(y, minY, maxY);

  const minDist = table.ballRadius * 2.04;
  const minDistSq = minDist * minDist;

  for (let i = 0; i < balls.length; i += 1) {
    const other = balls[i];
    if (other.pocketed || other.number === 0) continue;
    const dx = cue.x - other.x;
    const dy = cue.y - other.y;
    if (dx * dx + dy * dy < minDistSq) return false;
  }

  return true;
}

export function strikeCueBall(cue: PoolBall, direction: Vec2, power: number, spinX: number, spinY: number): void {
  const clampedPower = clamp(power, 0.06, 1);
  const speed = 840 * clampedPower;
  cue.vx = direction.x * speed;
  cue.vy = direction.y * speed;
  cue.spinX = clamp(spinX, -1, 1);
  cue.spinY = clamp(spinY, -1, 1);
}

export function stepPoolPhysics(
  balls: PoolBall[],
  table: TableGeometry,
  deltaSec: number,
  shotOpen: boolean,
  scratch: PhysicsStepScratch
): PhysicsStepResult {
  let moving = false;
  const event = {
    cueFirstObjectHit: null as number | null,
    railAfterContact: false,
    pocketed: [] as number[],
    cuePocketed: false,
    anyContact: false
  };

  let maxSpeed = 0;
  for (let i = 0; i < balls.length; i += 1) {
    const b = balls[i];
    if (b.pocketed) continue;
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > maxSpeed) maxSpeed = speed;
  }

  const span = table.ballRadius * 0.45;
  const stepsNeeded = Math.max(1, Math.ceil((maxSpeed * deltaSec) / Math.max(1, span)));
  const steps = Math.min(scratch.maxSubSteps, stepsNeeded);
  const subDt = deltaSec / steps;

  const normal = { x: 0, y: 0 };
  for (let step = 0; step < steps; step += 1) {
    for (let i = 0; i < balls.length; i += 1) {
      const b = balls[i];
      if (b.pocketed) continue;

      const speed = Math.hypot(b.vx, b.vy);
      if (speed > 0.001) {
        const sideForce = b.spinX * 120;
        const topBack = b.spinY * 80;
        b.vx += (-b.vy / speed) * sideForce * subDt;
        b.vy += (b.vx / speed) * sideForce * subDt;
        b.vx += (b.vx / speed) * topBack * subDt;
        b.vy += (b.vy / speed) * topBack * subDt;
      }

      b.x += b.vx * subDt;
      b.y += b.vy * subDt;

      const frictionDrop = table.friction * 100 * subDt;
      const nextSpeed = Math.max(0, speed - frictionDrop);
      if (speed > 0) {
        const ratio = nextSpeed / speed;
        b.vx *= ratio;
        b.vy *= ratio;
      }

      b.spinX *= 0.985;
      b.spinY *= 0.985;

      const left = table.bounds.left + table.ballRadius;
      const right = table.bounds.right - table.ballRadius;
      const top = table.bounds.top + table.ballRadius;
      const bottom = table.bounds.bottom - table.ballRadius;

      let railHit = false;
      if (b.x < left) {
        b.x = left;
        b.vx = Math.abs(b.vx) * table.railRestitution;
        railHit = true;
      } else if (b.x > right) {
        b.x = right;
        b.vx = -Math.abs(b.vx) * table.railRestitution;
        railHit = true;
      }

      if (b.y < top) {
        b.y = top;
        b.vy = Math.abs(b.vy) * table.railRestitution;
        railHit = true;
      } else if (b.y > bottom) {
        b.y = bottom;
        b.vy = -Math.abs(b.vy) * table.railRestitution;
        railHit = true;
      }

      if (railHit && shotOpen) {
        event.railAfterContact = true;
      }

      for (let p = 0; p < table.pockets.length; p += 1) {
        const pocket = table.pockets[p];
        const dx = b.x - pocket.x;
        const dy = b.y - pocket.y;
        const capR = pocket.radius + table.pocketCaptureRadius;
        if (dx * dx + dy * dy <= capR * capR) {
          b.pocketed = true;
          b.vx = 0;
          b.vy = 0;
          b.spinX = 0;
          b.spinY = 0;
          b.x = pocket.x;
          b.y = pocket.y;
          event.pocketed.push(b.number);
          if (b.number === 0) {
            event.cuePocketed = true;
          }
          break;
        }
      }
    }

    for (let i = 0; i < balls.length; i += 1) {
      const a = balls[i];
      if (a.pocketed) continue;
      for (let j = i + 1; j < balls.length; j += 1) {
        const b = balls[j];
        if (b.pocketed) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minDist = table.ballRadius * 2;
        const distSq = dx * dx + dy * dy;
        if (distSq >= minDist * minDist || distSq <= 1e-8) continue;

        const dist = Math.sqrt(distSq);
        normalize(normal, dx / dist, dy / dist);
        const overlap = minDist - dist;
        const sepX = normal.x * overlap * 0.5;
        const sepY = normal.y * overlap * 0.5;

        a.x -= sepX;
        a.y -= sepY;
        b.x += sepX;
        b.y += sepY;

        const relVx = b.vx - a.vx;
        const relVy = b.vy - a.vy;
        const relNormal = relVx * normal.x + relVy * normal.y;
        if (relNormal > 0) continue;

        const impulse = -(1 + table.ballRestitution) * relNormal * 0.5;
        const impX = impulse * normal.x;
        const impY = impulse * normal.y;

        a.vx -= impX;
        a.vy -= impY;
        b.vx += impX;
        b.vy += impY;

        event.anyContact = true;
        if (shotOpen && event.cueFirstObjectHit === null) {
          if (a.number === 0 && b.number !== 0) event.cueFirstObjectHit = b.number;
          else if (b.number === 0 && a.number !== 0) event.cueFirstObjectHit = a.number;
        }
      }
    }
  }

  for (let i = 0; i < balls.length; i += 1) {
    const b = balls[i];
    if (b.pocketed) continue;
    const speed = Math.hypot(b.vx, b.vy);
    if (speed < table.sleepSpeed) {
      b.vx = 0;
      b.vy = 0;
      b.spinX *= 0.85;
      b.spinY *= 0.85;
    }
    if (Math.hypot(b.vx, b.vy) > table.sleepSpeed) moving = true;
  }

  return { moving, event };
}

export function firstActiveBallNumber(balls: PoolBall[]): number | null {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < balls.length; i += 1) {
    const b = balls[i];
    if (b.pocketed || b.number === 0) continue;
    if (b.number < best) best = b.number;
  }
  return Number.isFinite(best) ? best : null;
}

export function activeBallNumbers(balls: PoolBall[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < balls.length; i += 1) {
    const b = balls[i];
    if (!b.pocketed && b.number !== 0) out.push(b.number);
  }
  return out;
}

export function estimateGhostBallTarget(
  cue: PoolBall,
  direction: Vec2,
  balls: PoolBall[],
  table: TableGeometry
): Vec2 | null {
  let bestT = Number.POSITIVE_INFINITY;
  let hitX = 0;
  let hitY = 0;

  for (let i = 0; i < balls.length; i += 1) {
    const b = balls[i];
    if (b.pocketed || b.number === 0) continue;

    const ox = cue.x - b.x;
    const oy = cue.y - b.y;
    const r = table.ballRadius * 2;
    const a = direction.x * direction.x + direction.y * direction.y;
    const bb = 2 * (ox * direction.x + oy * direction.y);
    const c = ox * ox + oy * oy - r * r;
    const disc = bb * bb - 4 * a * c;
    if (disc < 0) continue;
    const s = Math.sqrt(disc);
    const t0 = (-bb - s) / (2 * a);
    if (t0 > 0 && t0 < bestT) {
      bestT = t0;
      hitX = cue.x + direction.x * t0;
      hitY = cue.y + direction.y * t0;
    }
  }

  if (!Number.isFinite(bestT)) return null;
  return { x: hitX, y: hitY };
}
