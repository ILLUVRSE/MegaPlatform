import type { BallState, PhysicsScratch, RodState, TableBounds, TeamSide } from './types';

const REST_SPEED = 14;

export function createTableBounds(): TableBounds {
  return {
    left: 80,
    right: 1200,
    top: 90,
    bottom: 630,
    goalTop: 290,
    goalBottom: 430,
    centerX: 640,
    centerY: 360
  };
}

export function createBallState(bounds: TableBounds): BallState {
  return {
    x: bounds.centerX,
    y: bounds.centerY,
    vx: 0,
    vy: 0,
    radius: 12,
    restFrames: 0
  };
}

export function createPhysicsScratch(): PhysicsScratch {
  return {
    stepResult: {
      goalScoredBy: null,
      wallHit: false,
      rodHitBy: null,
      antiPinningApplied: false
    }
  };
}

export function resetBallToCenter(ball: BallState, bounds: TableBounds, serveTo: TeamSide, speed = 260): void {
  ball.x = bounds.centerX;
  ball.y = bounds.centerY;
  ball.vx = serveTo === 'player' ? speed : -speed;
  ball.vy = 0;
  ball.restFrames = 0;
}

export function detectGoal(ball: BallState, bounds: TableBounds): TeamSide | null {
  const inGoalMouth = ball.y - ball.radius >= bounds.goalTop && ball.y + ball.radius <= bounds.goalBottom;
  if (!inGoalMouth) return null;
  if (ball.x + ball.radius < bounds.left) return 'ai';
  if (ball.x - ball.radius > bounds.right) return 'player';
  return null;
}

export function detectGoalAndReset(ball: BallState, bounds: TableBounds): TeamSide | null {
  const scorer = detectGoal(ball, bounds);
  if (!scorer) return null;
  resetBallToCenter(ball, bounds, scorer === 'player' ? 'ai' : 'player');
  return scorer;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function handleWallBounce(ball: BallState, bounds: TableBounds, stepResult: PhysicsScratch['stepResult']): void {
  if (ball.y - ball.radius <= bounds.top && ball.vy < 0) {
    ball.y = bounds.top + ball.radius;
    ball.vy *= -0.9;
    stepResult.wallHit = true;
  } else if (ball.y + ball.radius >= bounds.bottom && ball.vy > 0) {
    ball.y = bounds.bottom - ball.radius;
    ball.vy *= -0.9;
    stepResult.wallHit = true;
  }

  const inGoalMouth = ball.y - ball.radius >= bounds.goalTop && ball.y + ball.radius <= bounds.goalBottom;
  if (inGoalMouth) return;

  if (ball.x - ball.radius <= bounds.left && ball.vx < 0) {
    ball.x = bounds.left + ball.radius;
    ball.vx *= -0.9;
    stepResult.wallHit = true;
  } else if (ball.x + ball.radius >= bounds.right && ball.vx > 0) {
    ball.x = bounds.right - ball.radius;
    ball.vx *= -0.9;
    stepResult.wallHit = true;
  }
}

function collideBallWithRodPlayers(ball: BallState, rods: readonly RodState[], stepResult: PhysicsScratch['stepResult']): void {
  for (let i = 0; i < rods.length; i += 1) {
    const rod = rods[i];
    for (let j = 0; j < rod.players.length; j += 1) {
      const p = rod.players[j];
      const dx = ball.x - p.x;
      const dy = ball.y - p.y;
      const minDist = ball.radius + p.radius;
      const distSq = dx * dx + dy * dy;
      if (distSq >= minDist * minDist || distSq <= 0.000001) continue;
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;
      ball.x += nx * overlap;
      ball.y += ny * overlap;

      const relative = ball.vx * nx + ball.vy * ny;
      if (relative < 0) {
        ball.vx -= relative * 1.92 * nx;
        ball.vy -= relative * 1.92 * ny;
      } else {
        ball.vx += nx * 16;
        ball.vy += ny * 16;
      }
      stepResult.rodHitBy = p.team;
    }
  }
}

function applyAntiPinning(ball: BallState, rods: readonly RodState[], bounds: TableBounds, stepResult: PhysicsScratch['stepResult']): void {
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > 40) return;

  const nearLeft = ball.x - ball.radius <= bounds.left + 4;
  const nearRight = ball.x + ball.radius >= bounds.right - 4;
  const nearTop = ball.y - ball.radius <= bounds.top + 4;
  const nearBottom = ball.y + ball.radius >= bounds.bottom - 4;
  if (!nearLeft && !nearRight && !nearTop && !nearBottom) return;

  let overlapping = false;
  for (let i = 0; i < rods.length && !overlapping; i += 1) {
    const rod = rods[i];
    for (let j = 0; j < rod.players.length; j += 1) {
      const p = rod.players[j];
      const dx = ball.x - p.x;
      const dy = ball.y - p.y;
      const minDist = ball.radius + p.radius - 2;
      if (dx * dx + dy * dy < minDist * minDist) {
        overlapping = true;
        break;
      }
    }
  }

  if (!overlapping) return;

  if (nearLeft) ball.vx = Math.max(ball.vx, 70);
  if (nearRight) ball.vx = Math.min(ball.vx, -70);
  if (nearTop) ball.vy = Math.max(ball.vy, 60);
  if (nearBottom) ball.vy = Math.min(ball.vy, -60);

  ball.x = clamp(ball.x, bounds.left + ball.radius + 1, bounds.right - ball.radius - 1);
  ball.y = clamp(ball.y, bounds.top + ball.radius + 1, bounds.bottom - ball.radius - 1);
  stepResult.antiPinningApplied = true;
}

export function stepBallPhysics(
  ball: BallState,
  rods: readonly RodState[],
  bounds: TableBounds,
  dt: number,
  scratch: PhysicsScratch
): PhysicsScratch['stepResult'] {
  const result = scratch.stepResult;
  result.goalScoredBy = null;
  result.wallHit = false;
  result.rodHitBy = null;
  result.antiPinningApplied = false;

  const speed = Math.hypot(ball.vx, ball.vy);
  const slices = Math.max(1, Math.min(8, Math.ceil((speed * dt) / Math.max(1, ball.radius * 0.7))));
  const stepDt = dt / slices;

  for (let i = 0; i < slices; i += 1) {
    ball.x += ball.vx * stepDt;
    ball.y += ball.vy * stepDt;

    const scorer = detectGoal(ball, bounds);
    if (scorer) {
      result.goalScoredBy = scorer;
      return result;
    }

    handleWallBounce(ball, bounds, result);
    collideBallWithRodPlayers(ball, rods, result);
  }

  applyAntiPinning(ball, rods, bounds, result);

  ball.vx *= 0.992;
  ball.vy *= 0.992;

  if (Math.hypot(ball.vx, ball.vy) < REST_SPEED) {
    ball.restFrames += 1;
    if (ball.restFrames > 6) {
      ball.vx = 0;
      ball.vy = 0;
    }
  } else {
    ball.restFrames = 0;
  }

  return result;
}

export function applyKickImpulse(
  ball: BallState,
  rod: RodState,
  strength: number,
  shootAssist: boolean,
  toward: TeamSide,
  isPass: boolean
): void {
  const dirX = toward === 'player' ? 1 : -1;
  const assist = shootAssist ? 0.8 : 1;
  const power = 360 * strength * assist;

  let nearestY = rod.players[0]?.y ?? rod.y;
  let nearestDist = Math.abs(ball.y - nearestY);
  for (let i = 1; i < rod.players.length; i += 1) {
    const y = rod.players[i].y;
    const dist = Math.abs(ball.y - y);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestY = y;
    }
  }

  const yError = clamp((ball.y - nearestY) / 90, -1, 1);
  const lateral = isPass ? yError * 120 : yError * 200;
  const passDir = isPass ? -dirX * 0.4 : 1;

  ball.vx += dirX * power * passDir;
  ball.vy += lateral;
  ball.restFrames = 0;
}
