import { getSurfaceMaterialAt, isWaterAt, rectContainsPoint, sampleSlopeAt } from './surfaces';
import { MINIGOLF_COLLISION_TUNING, MINIGOLF_STOP_TUNING } from './gameplayTheme';
import { stepFixedSimulation } from './sim';
import type { BallState, MinigolfHole, MovingObstacle, PhysicsConfig, PhysicsScratch, PhysicsStepResult, ShotInput } from './types';

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  restitution: 0.82,
  rollingFriction: 36,
  slidingFriction: 78,
  sandRollingFriction: 96,
  sandSlidingFriction: 145,
  iceRollingFriction: 12,
  iceSlidingFriction: 24,
  sleepEnterLinearSpeed: 8,
  sleepExitLinearSpeed: 14,
  sleepEnterAngularSpeed: 5,
  sleepExitAngularSpeed: 10,
  sleepFrames: 10,
  maxSlopeAccel: 180,
  fixedDtSec: 1 / 120,
  maxSubstepsPerFrame: 4
};

export function createPhysicsScratch(): PhysicsScratch {
  return {
    closestX: 0,
    closestY: 0,
    normalX: 0,
    normalY: 0
  };
}

export function createPhysicsStepResult(): PhysicsStepResult {
  return {
    hitWall: false,
    hitSand: false,
    enteredWater: false,
    sunk: false
  };
}

export function resetPhysicsStepResult(result: PhysicsStepResult) {
  result.hitWall = false;
  result.hitSand = false;
  result.enteredWater = false;
  result.sunk = false;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function vecLen(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

function clampVectorMagnitude(x: number, y: number, maxMag: number, out: { x: number; y: number }) {
  const mag = vecLen(x, y);
  if (mag <= maxMag || mag < 1e-6) {
    out.x = x;
    out.y = y;
    return;
  }
  const scale = maxMag / mag;
  out.x = x * scale;
  out.y = y * scale;
}

function applyCollisionImpulse(ball: BallState, normalX: number, normalY: number, restitution: number) {
  const preSpeedSq = ball.vx * ball.vx + ball.vy * ball.vy;
  const vn = ball.vx * normalX + ball.vy * normalY;
  if (vn >= 0) return;

  const reflectedVn = -vn * restitution;
  const tangentX = ball.vx - normalX * vn;
  const tangentY = ball.vy - normalY * vn;
  ball.vx = tangentX * MINIGOLF_COLLISION_TUNING.tangentialDamping + normalX * reflectedVn;
  ball.vy = tangentY * MINIGOLF_COLLISION_TUNING.tangentialDamping + normalY * reflectedVn;

  const postSpeedSq = ball.vx * ball.vx + ball.vy * ball.vy;
  if (postSpeedSq > preSpeedSq + 1e-4 && preSpeedSq > 1e-8) {
    const scale = Math.sqrt(preSpeedSq / postSpeedSq);
    ball.vx *= scale;
    ball.vy *= scale;
  }
  const postSpeed = vecLen(ball.vx, ball.vy);
  const preSpeed = Math.sqrt(preSpeedSq);
  const speedLimit = Math.min(
    MINIGOLF_COLLISION_TUNING.maxBounceSpeed,
    Math.max(preSpeed, preSpeed * MINIGOLF_COLLISION_TUNING.maxBounceSpeedGainRatio)
  );
  if (postSpeed > speedLimit && postSpeed > 1e-6) {
    const clampScale = speedLimit / postSpeed;
    ball.vx *= clampScale;
    ball.vy *= clampScale;
  }
  if (Math.abs(ball.vx) < MINIGOLF_COLLISION_TUNING.tinyVelocityEps) ball.vx = 0;
  if (Math.abs(ball.vy) < MINIGOLF_COLLISION_TUNING.tinyVelocityEps) ball.vy = 0;

  ball.angularVelocity *= 0.92;
}

function collideCircle(ball: BallState, cx: number, cy: number, radius: number, restitution: number): boolean {
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const rr = radius + ball.radius;
  const distSq = dx * dx + dy * dy;
  if (distSq >= rr * rr) return false;

  let dist = Math.sqrt(distSq);
  let nx = 1;
  let ny = 0;
  if (dist > 1e-6) {
    nx = dx / dist;
    ny = dy / dist;
  } else {
    dist = 0;
  }

  const push = rr - dist;
  ball.x += nx * push;
  ball.y += ny * push;
  applyCollisionImpulse(ball, nx, ny, restitution);
  return true;
}

function collideRect(ball: BallState, x: number, y: number, width: number, height: number, restitution: number): boolean {
  const closestX = clamp(ball.x, x, x + width);
  const closestY = clamp(ball.y, y, y + height);
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  const distSq = dx * dx + dy * dy;
  if (distSq >= ball.radius * ball.radius) return false;

  let nx = 0;
  let ny = 0;
  let dist = Math.sqrt(distSq);

  if (dist > 1e-6) {
    nx = dx / dist;
    ny = dy / dist;
  } else {
    const left = Math.abs(ball.x - x);
    const right = Math.abs(ball.x - (x + width));
    const top = Math.abs(ball.y - y);
    const bottom = Math.abs(ball.y - (y + height));

    const minEdge = Math.min(left, right, top, bottom);
    if (minEdge === left) nx = -1;
    else if (minEdge === right) nx = 1;
    else if (minEdge === top) ny = -1;
    else ny = 1;

    dist = 0;
  }

  const push = ball.radius - dist;
  ball.x += nx * push;
  ball.y += ny * push;
  applyCollisionImpulse(ball, nx, ny, restitution);
  return true;
}

function collideSegment(ball: BallState, x1: number, y1: number, x2: number, y2: number, scratch: PhysicsScratch, restitution: number): boolean {
  const abx = x2 - x1;
  const aby = y2 - y1;
  const apx = ball.x - x1;
  const apy = ball.y - y1;
  const abLenSq = abx * abx + aby * aby;
  const t = abLenSq > 1e-6 ? clamp((apx * abx + apy * aby) / abLenSq, 0, 1) : 0;

  scratch.closestX = x1 + abx * t;
  scratch.closestY = y1 + aby * t;

  const dx = ball.x - scratch.closestX;
  const dy = ball.y - scratch.closestY;
  const distSq = dx * dx + dy * dy;
  if (distSq >= ball.radius * ball.radius) return false;

  let dist = Math.sqrt(distSq);
  if (dist > 1e-6) {
    scratch.normalX = dx / dist;
    scratch.normalY = dy / dist;
  } else {
    const len = Math.sqrt(abLenSq) || 1;
    scratch.normalX = -aby / len;
    scratch.normalY = abx / len;
    dist = 0;
  }

  const push = ball.radius - dist;
  ball.x += scratch.normalX * push;
  ball.y += scratch.normalY * push;
  applyCollisionImpulse(ball, scratch.normalX, scratch.normalY, restitution);
  return true;
}

function distanceToSegmentSq(x: number, y: number, x1: number, y1: number, x2: number, y2: number): number {
  const abx = x2 - x1;
  const aby = y2 - y1;
  const apx = x - x1;
  const apy = y - y1;
  const abLenSq = abx * abx + aby * aby;
  const t = abLenSq > 1e-6 ? clamp((apx * abx + apy * aby) / abLenSq, 0, 1) : 0;
  const cx = x1 + t * abx;
  const cy = y1 + t * aby;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy;
}

function movingObstacleRect(obstacle: MovingObstacle, elapsedMs: number, out: { x: number; y: number }) {
  const phase = obstacle.phase + (elapsedMs / 1000) * obstacle.speed;
  const offset = Math.sin(phase) * obstacle.range;
  if (obstacle.axis === 'x') {
    out.x = obstacle.x + offset;
    out.y = obstacle.y;
  } else {
    out.x = obstacle.x;
    out.y = obstacle.y + offset;
  }
}

function wakeFromSlope(ball: BallState, slopeX: number, slopeY: number, dtSec: number, config: PhysicsConfig) {
  if (ball.moving) return;
  const slopeMag = vecLen(slopeX, slopeY);
  if (slopeMag < config.sleepExitLinearSpeed * 0.9) return;
  ball.vx += slopeX * dtSec;
  ball.vy += slopeY * dtSec;
  ball.angularVelocity = Math.max(ball.angularVelocity, vecLen(ball.vx, ball.vy) / Math.max(1, ball.radius));
  ball.moving = true;
  ball.restFrames = 0;
}

function applySurfaceFriction(ball: BallState, dtSec: number, rollingFriction: number, slidingFriction: number) {
  const speed = vecLen(ball.vx, ball.vy);
  if (speed < 1e-6) {
    ball.vx = 0;
    ball.vy = 0;
    ball.angularVelocity *= Math.max(0, 1 - dtSec * 12);
    return;
  }

  const rollEquivalent = Math.abs(ball.angularVelocity) * ball.radius;
  const slip = Math.max(0, speed - rollEquivalent);
  const useSliding = slip > 6;
  const friction = useSliding ? slidingFriction : rollingFriction;
  const lowSpeedDamping = speed < MINIGOLF_STOP_TUNING.lowSpeedThreshold ? MINIGOLF_STOP_TUNING.lowSpeedDamping : 0;
  const decel = (friction + lowSpeedDamping) * dtSec;
  const nextSpeed = Math.max(0, speed - decel);
  const scale = nextSpeed > 0 ? nextSpeed / speed : 0;
  ball.vx *= scale;
  ball.vy *= scale;

  const targetAngular = nextSpeed / Math.max(1, ball.radius);
  const coupling = useSliding ? 8 : 4;
  ball.angularVelocity += (targetAngular - ball.angularVelocity) * Math.min(1, coupling * dtSec);
}

function applyBoundCollision(ball: BallState, bounds: MinigolfHole['bounds'], restitution: number, result: PhysicsStepResult): void {
  let hit = false;
  if (ball.x - ball.radius < bounds.x) {
    ball.x = bounds.x + ball.radius;
    applyCollisionImpulse(ball, 1, 0, restitution);
    hit = true;
  } else if (ball.x + ball.radius > bounds.x + bounds.width) {
    ball.x = bounds.x + bounds.width - ball.radius;
    applyCollisionImpulse(ball, -1, 0, restitution);
    hit = true;
  }

  if (ball.y - ball.radius < bounds.y) {
    ball.y = bounds.y + ball.radius;
    applyCollisionImpulse(ball, 0, 1, restitution);
    hit = true;
  } else if (ball.y + ball.radius > bounds.y + bounds.height) {
    ball.y = bounds.y + bounds.height - ball.radius;
    applyCollisionImpulse(ball, 0, -1, restitution);
    hit = true;
  }

  if (hit) {
    result.hitWall = true;
  }
}

function isRespawnPointClear(
  hole: MinigolfHole,
  x: number,
  y: number,
  radius: number,
  elapsedMs: number,
  scratch: PhysicsScratch,
  obstacleScratch: { x: number; y: number }
): boolean {
  if (!rectContainsPoint(x, y, hole.bounds)) return false;
  if (isWaterAt(hole, x, y)) return false;

  const walls = hole.walls;
  const limit = (radius + 1) * (radius + 1);
  for (let i = 0; i < walls.length; i += 1) {
    const wall = walls[i];
    if (distanceToSegmentSq(x, y, wall.x1, wall.y1, wall.x2, wall.y2) <= limit) {
      return false;
    }
  }

  const bumpers = hole.bumpers;
  for (let i = 0; i < bumpers.length; i += 1) {
    const b = bumpers[i];
    const probe: BallState = { x, y, vx: 0, vy: 0, angularVelocity: 0, radius, moving: false, restFrames: 0 };
    const hit = b.kind === 'circle' ? collideCircle(probe, b.x, b.y, b.radius, 0) : collideRect(probe, b.x, b.y, b.width, b.height, 0);
    if (hit) return false;
  }

  const obstacles = hole.movingObstacles;
  for (let i = 0; i < obstacles.length; i += 1) {
    movingObstacleRect(obstacles[i], elapsedMs, obstacleScratch);
    const probe: BallState = { x, y, vx: 0, vy: 0, angularVelocity: 0, radius, moving: false, restFrames: 0 };
    if (collideRect(probe, obstacleScratch.x, obstacleScratch.y, obstacles[i].width, obstacles[i].height, 0)) {
      return false;
    }
  }

  const cupDistSq = (hole.cup.x - x) * (hole.cup.x - x) + (hole.cup.y - y) * (hole.cup.y - y);
  const cupLimit = Math.max(4, hole.cup.radius - radius * 0.33);
  if (cupDistSq <= cupLimit * cupLimit) return false;

  // keep scratch referenced so callers can share scratch objects
  scratch.closestX += 0;
  return true;
}

export function findNearestSafeRespawn(
  hole: MinigolfHole,
  startX: number,
  startY: number,
  radius: number,
  elapsedMs: number,
  scratch: PhysicsScratch,
  obstacleScratch: { x: number; y: number },
  out: { x: number; y: number }
): { x: number; y: number } {
  if (isRespawnPointClear(hole, startX, startY, radius, elapsedMs, scratch, obstacleScratch)) {
    out.x = startX;
    out.y = startY;
    return out;
  }

  const step = Math.max(8, radius * 0.9);
  for (let ring = 1; ring <= 26; ring += 1) {
    const r = ring * step;
    const segments = 12 + ring * 6;
    for (let i = 0; i < segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      const x = startX + Math.cos(angle) * r;
      const y = startY + Math.sin(angle) * r;
      if (isRespawnPointClear(hole, x, y, radius, elapsedMs, scratch, obstacleScratch)) {
        out.x = x;
        out.y = y;
        return out;
      }
    }
  }

  out.x = hole.start.x;
  out.y = hole.start.y;
  if (!isRespawnPointClear(hole, out.x, out.y, radius, elapsedMs, scratch, obstacleScratch)) {
    out.x = hole.bounds.x + radius + 2;
    out.y = hole.bounds.y + radius + 2;
  }
  return out;
}

export function applyShot(ball: BallState, input: ShotInput) {
  const speed = input.power;
  ball.vx = Math.cos(input.angle) * speed;
  ball.vy = Math.sin(input.angle) * speed;
  ball.angularVelocity = speed / Math.max(1, ball.radius);
  ball.moving = true;
  ball.restFrames = 0;
}

export function resetBall(ball: BallState, x: number, y: number) {
  ball.x = x;
  ball.y = y;
  ball.vx = 0;
  ball.vy = 0;
  ball.angularVelocity = 0;
  ball.moving = false;
  ball.restFrames = 0;
}

function simulateOneSubstep(
  ball: BallState,
  hole: MinigolfHole,
  elapsedMs: number,
  dtSec: number,
  config: PhysicsConfig,
  scratch: PhysicsScratch,
  slopeScratch: { x: number; y: number },
  obstacleScratch: { x: number; y: number },
  result: PhysicsStepResult
) {
  ball.x += ball.vx * dtSec;
  ball.y += ball.vy * dtSec;

  sampleSlopeAt(hole, ball.x, ball.y, slopeScratch);
  clampVectorMagnitude(slopeScratch.x, slopeScratch.y, config.maxSlopeAccel, slopeScratch);
  ball.vx += slopeScratch.x * dtSec;
  ball.vy += slopeScratch.y * dtSec;

  const material = getSurfaceMaterialAt(hole, ball.x, ball.y);
  const rolling = material === 'sand' ? config.sandRollingFriction : material === 'ice' ? config.iceRollingFriction : config.rollingFriction;
  const sliding = material === 'sand' ? config.sandSlidingFriction : material === 'ice' ? config.iceSlidingFriction : config.slidingFriction;
  applySurfaceFriction(ball, dtSec, rolling, sliding);

  if (material === 'sand') {
    result.hitSand = true;
  }

  applyBoundCollision(ball, hole.bounds, config.restitution, result);

  const walls = hole.walls;
  for (let i = 0; i < walls.length; i += 1) {
    const wall = walls[i];
    if (collideSegment(ball, wall.x1, wall.y1, wall.x2, wall.y2, scratch, config.restitution)) {
      result.hitWall = true;
    }
  }

  const bumpers = hole.bumpers;
  for (let i = 0; i < bumpers.length; i += 1) {
    const bumper = bumpers[i];
    const hit =
      bumper.kind === 'circle'
        ? collideCircle(ball, bumper.x, bumper.y, bumper.radius, config.restitution)
        : collideRect(ball, bumper.x, bumper.y, bumper.width, bumper.height, config.restitution);
    if (hit) {
      result.hitWall = true;
    }
  }

  const obstacles = hole.movingObstacles;
  for (let i = 0; i < obstacles.length; i += 1) {
    const obstacle = obstacles[i];
    movingObstacleRect(obstacle, elapsedMs, obstacleScratch);
    if (collideRect(ball, obstacleScratch.x, obstacleScratch.y, obstacle.width, obstacle.height, config.restitution)) {
      result.hitWall = true;
    }
  }
}

export function stepBallPhysics(
  ball: BallState,
  hole: MinigolfHole,
  elapsedMs: number,
  dtSec: number,
  config: PhysicsConfig,
  scratch: PhysicsScratch,
  slopeScratch: { x: number; y: number },
  obstacleScratch: { x: number; y: number },
  result: PhysicsStepResult
) {
  if (!ball.moving) {
    sampleSlopeAt(hole, ball.x, ball.y, slopeScratch);
    clampVectorMagnitude(slopeScratch.x, slopeScratch.y, config.maxSlopeAccel, slopeScratch);
    wakeFromSlope(ball, slopeScratch.x, slopeScratch.y, dtSec, config);
    if (!ball.moving) {
      return;
    }
  }

  const speed = vecLen(ball.vx, ball.vy);
  const substepCount = clamp(Math.ceil((speed * dtSec) / Math.max(1, ball.radius * 0.55)), 1, 8);
  const subDt = dtSec / substepCount;

  for (let i = 0; i < substepCount; i += 1) {
    simulateOneSubstep(ball, hole, elapsedMs, subDt, config, scratch, slopeScratch, obstacleScratch, result);

    if (isWaterAt(hole, ball.x, ball.y)) {
      result.enteredWater = true;
      ball.vx = 0;
      ball.vy = 0;
      ball.angularVelocity = 0;
      ball.moving = false;
      ball.restFrames = 0;
      return;
    }

    const dxCup = hole.cup.x - ball.x;
    const dyCup = hole.cup.y - ball.y;
    void dxCup;
    void dyCup;
  }

  const postSpeed = vecLen(ball.vx, ball.vy);
  const angular = Math.abs(ball.angularVelocity);
  if (postSpeed < MINIGOLF_STOP_TUNING.stopEps) {
    ball.stopTimerMs = (ball.stopTimerMs ?? 0) + dtSec * 1000;
    if (ball.stopTimerMs >= MINIGOLF_STOP_TUNING.stopMs) {
      ball.vx = 0;
      ball.vy = 0;
      ball.angularVelocity = 0;
      ball.moving = false;
      ball.restFrames = 0;
      ball.stopTimerMs = 0;
      return;
    }
  } else {
    ball.stopTimerMs = 0;
  }

  if (postSpeed <= config.sleepEnterLinearSpeed && angular <= config.sleepEnterAngularSpeed) {
    ball.restFrames += 1;
    if (ball.restFrames >= config.sleepFrames) {
      ball.vx = 0;
      ball.vy = 0;
      ball.angularVelocity = 0;
      ball.moving = false;
      ball.restFrames = 0;
    }
  } else if (postSpeed >= config.sleepExitLinearSpeed || angular >= config.sleepExitAngularSpeed) {
    ball.restFrames = 0;
  }

  if (rectContainsPoint(ball.x, ball.y, hole.bounds)) {
    // sentinel path: callers update safe checkpoints at full rest only
  }
}

export function stepBallPhysicsFixed(
  ball: BallState,
  hole: MinigolfHole,
  elapsedMs: number,
  frameDtSec: number,
  accumulatorSec: number,
  config: PhysicsConfig,
  scratch: PhysicsScratch,
  slopeScratch: { x: number; y: number },
  obstacleScratch: { x: number; y: number },
  result: PhysicsStepResult
): number {
  const stepped = stepFixedSimulation(
    accumulatorSec,
    frameDtSec,
    {
      fixedDtSec: config.fixedDtSec,
      maxSubstepsPerFrame: config.maxSubstepsPerFrame
    },
    (fixedDt, stepIndex) => {
      stepBallPhysics(ball, hole, elapsedMs + stepIndex * fixedDt * 1000, fixedDt, config, scratch, slopeScratch, obstacleScratch, result);
      return result.enteredWater || result.sunk;
    }
  );
  return stepped.accumulatorSec;
}
