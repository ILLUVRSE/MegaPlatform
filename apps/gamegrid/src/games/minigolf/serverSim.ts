import { MINIGOLF_COLLISION_TUNING, MINIGOLF_INPUT_TUNING } from './gameplayTheme';
import {
  applyShot,
  createPhysicsScratch,
  createPhysicsStepResult,
  DEFAULT_PHYSICS_CONFIG,
  resetPhysicsStepResult,
  stepBallPhysics
} from './physics';
import { stepFixedSimulation } from './sim';
import { isWaterAt, rectContainsPoint } from './surfaces';
import type { BallState, MinigolfHole } from './types';

const SERVER_FRAME_DT_SEC = 1 / 60;
const DEFAULT_MAX_SIM_MS = 12_000;

export type ServerSimulationReason = 'rest' | 'water' | 'limit' | 'invalid';

export interface ServerShotSummary {
  finalX: number;
  finalY: number;
  landed: boolean;
  reason: ServerSimulationReason;
  hitWall: boolean;
  hitSand: boolean;
  enteredWater: boolean;
}

function isBallOutsideHole(ball: BallState, hole: MinigolfHole): boolean {
  return !rectContainsPoint(ball.x, ball.y, hole.bounds);
}

function createStartBall(hole: MinigolfHole, startBall?: Partial<BallState>): BallState {
  return {
    x: startBall?.x ?? hole.start.x,
    y: startBall?.y ?? hole.start.y,
    vx: 0,
    vy: 0,
    angularVelocity: 0,
    radius: startBall?.radius ?? 10,
    moving: false,
    restFrames: 0,
    stopTimerMs: 0
  };
}

export function simulateShotForServer(
  hole: MinigolfHole,
  shot: { angle: number; power: number },
  startBall?: Partial<BallState>,
  maxSimMs = DEFAULT_MAX_SIM_MS
): ServerShotSummary {
  const ball = createStartBall(hole, startBall);
  const scratch = createPhysicsScratch();
  const slopeScratch = { x: 0, y: 0 };
  const obstacleScratch = { x: 0, y: 0 };
  const result = createPhysicsStepResult();
  const maxSimDurationMs = Math.max(maxSimMs, Math.ceil(MINIGOLF_COLLISION_TUNING.maxBounceSpeed));

  if (!rectContainsPoint(ball.x, ball.y, hole.bounds) || isWaterAt(hole, ball.x, ball.y)) {
    return {
      finalX: ball.x,
      finalY: ball.y,
      landed: false,
      reason: 'invalid',
      hitWall: false,
      hitSand: false,
      enteredWater: false
    };
  }

  applyShot(ball, {
    angle: Number.isFinite(shot.angle) ? shot.angle : 0,
    power: Math.max(0, Math.min(1, shot.power)) * MINIGOLF_INPUT_TUNING.maxShotPower
  });

  let accumulatorSec = 0;
  let elapsedMs = 0;
  let hitWall = false;
  let hitSand = false;
  let enteredWater = false;
  let landed = false;
  let reason: ServerSimulationReason = 'limit';

  while (elapsedMs < maxSimDurationMs) {
    resetPhysicsStepResult(result);
    const stepped = stepFixedSimulation(
      accumulatorSec,
      SERVER_FRAME_DT_SEC,
      {
        fixedDtSec: DEFAULT_PHYSICS_CONFIG.fixedDtSec,
        maxSubstepsPerFrame: DEFAULT_PHYSICS_CONFIG.maxSubstepsPerFrame
      },
      (fixedDtSec) => {
        stepBallPhysics(ball, hole, elapsedMs, fixedDtSec, DEFAULT_PHYSICS_CONFIG, scratch, slopeScratch, obstacleScratch, result);
        elapsedMs += fixedDtSec * 1000;
        hitWall ||= result.hitWall;
        hitSand ||= result.hitSand;
        enteredWater ||= result.enteredWater;
        if (result.enteredWater) {
          reason = 'water';
          return true;
        }
        if (isBallOutsideHole(ball, hole)) {
          reason = 'invalid';
          return true;
        }
        if (!ball.moving) {
          landed = true;
          reason = 'rest';
          return true;
        }
        return false;
      }
    );
    accumulatorSec = stepped.accumulatorSec;
    if (reason !== 'limit') break;
    if (stepped.substeps === 0) {
      break;
    }
  }

  return {
    finalX: ball.x,
    finalY: ball.y,
    landed,
    reason,
    hitWall,
    hitSand,
    enteredWater
  };
}
