import { mapSpinToBounce } from './spin';
import type { BallState, PaddleShot, PhysicsScratch, PhysicsStepResult, PlayerIndex, TablePhysicsConfig } from './types';

export const DEFAULT_TABLE_PHYSICS: TablePhysicsConfig = {
  gravity: -980,
  netHeight: 22,
  tableHalfWidth: 210,
  tableHalfLength: 300,
  maxStepS: 1 / 120,
  bounceRestitution: 0.78,
  spinDrift: 48,
  spinDrive: 22,
  bounceCurve: 7
};

function resetResult(result: PhysicsStepResult) {
  result.ended = false;
  result.winner = null;
  result.reason = null;
  result.bounceSide = -1;
}

function sideFromY(y: number): PlayerIndex {
  return y >= 0 ? 0 : 1;
}

export function createBallState(): BallState {
  return {
    x: 0,
    y: 0,
    z: 24,
    vx: 0,
    vy: 0,
    vz: 0,
    spinX: 0,
    spinY: 0,
    active: false,
    lastHitter: null,
    bouncesOnPlayer: 0,
    bouncesOnAi: 0
  };
}

export function createPhysicsScratch(): PhysicsScratch {
  return { previousY: 0 };
}

export function createPhysicsResult(): PhysicsStepResult {
  return {
    ended: false,
    winner: null,
    reason: null,
    bounceSide: -1
  };
}

export function resetBallForServer(ball: BallState, server: PlayerIndex) {
  ball.x = 0;
  ball.y = server === 0 ? 230 : -230;
  ball.z = 24;
  ball.vx = 0;
  ball.vy = 0;
  ball.vz = 0;
  ball.spinX = 0;
  ball.spinY = 0;
  ball.active = false;
  ball.lastHitter = null;
  ball.bouncesOnPlayer = 0;
  ball.bouncesOnAi = 0;
}

export function applyPaddleHit(ball: BallState, shot: PaddleShot, hitter: PlayerIndex, isServe = false) {
  const baseSpeed = isServe ? 440 : 520;
  const speed = baseSpeed + shot.speed * (isServe ? 220 : 280);
  ball.active = true;
  ball.lastHitter = hitter;

  ball.vx = shot.dirX * speed * 0.58;
  ball.vy = (hitter === 0 ? -1 : 1) * (speed * 0.95);
  ball.vz = 220 + shot.speed * 180;

  ball.spinX = shot.spin * 55;
  ball.spinY = shot.spin * 0.52;
  ball.z = Math.max(ball.z, 18);

  ball.bouncesOnPlayer = 0;
  ball.bouncesOnAi = 0;
}

export function stepBallPhysics(
  ball: BallState,
  dtS: number,
  config: TablePhysicsConfig,
  scratch: PhysicsScratch,
  result: PhysicsStepResult
) {
  resetResult(result);
  if (!ball.active || dtS <= 0) return;

  const steps = Math.max(1, Math.ceil(dtS / config.maxStepS));
  const stepDt = dtS / steps;

  for (let i = 0; i < steps; i += 1) {
    scratch.previousY = ball.y;

    ball.vx += ball.spinX * config.spinDrift * 0.001 * stepDt;
    ball.vy += ball.spinY * config.spinDrive * stepDt;
    ball.vz += config.gravity * stepDt;

    ball.x += ball.vx * stepDt;
    ball.y += ball.vy * stepDt;
    ball.z += ball.vz * stepDt;

    const crossedNet = (scratch.previousY > 0 && ball.y <= 0) || (scratch.previousY < 0 && ball.y >= 0);
    if (crossedNet && ball.z <= config.netHeight) {
      result.ended = true;
      result.reason = 'net';
      if (ball.lastHitter !== null) {
        result.winner = (1 - ball.lastHitter) as PlayerIndex;
      }
      ball.active = false;
      return;
    }

    if (ball.z <= 0) {
      const inTable = Math.abs(ball.x) <= config.tableHalfWidth && Math.abs(ball.y) <= config.tableHalfLength;
      if (!inTable) {
        result.ended = true;
        result.reason = 'out';
        if (ball.lastHitter !== null) {
          result.winner = (1 - ball.lastHitter) as PlayerIndex;
        }
        ball.active = false;
        return;
      }

      const bounceSide = sideFromY(ball.y);
      result.bounceSide = bounceSide;

      if (bounceSide === 0) {
        ball.bouncesOnPlayer += 1;
      } else {
        ball.bouncesOnAi += 1;
      }

      if ((bounceSide === 0 && ball.bouncesOnPlayer > 1) || (bounceSide === 1 && ball.bouncesOnAi > 1)) {
        result.ended = true;
        result.reason = 'double_bounce';
        result.winner = (1 - bounceSide) as PlayerIndex;
        ball.active = false;
        return;
      }

      ball.z = 0;
      const bounced = mapSpinToBounce(ball.vy, ball.vx, ball.spinY);
      ball.vx = bounced.speedX + ball.spinX * config.bounceCurve * 0.01;
      ball.vy = bounced.speedY;
      ball.vz = Math.abs(ball.vz) * config.bounceRestitution;
      ball.spinX *= 0.91;
      ball.spinY *= 0.86;
    }

    if (Math.abs(ball.x) > config.tableHalfWidth * 1.8 || Math.abs(ball.y) > config.tableHalfLength * 1.9) {
      result.ended = true;
      result.reason = 'out';
      if (ball.lastHitter !== null) {
        result.winner = (1 - ball.lastHitter) as PlayerIndex;
      }
      ball.active = false;
      return;
    }
  }
}
