import { describe, expect, it } from 'vitest';
import { applyShot, createPhysicsScratch, createPhysicsStepResult, DEFAULT_PHYSICS_CONFIG, resetPhysicsStepResult, stepBallPhysics } from './physics';
import { stepFixedSimulation } from './sim';
import type { BallState, MinigolfHole } from './types';

function makeHole(overrides?: Partial<MinigolfHole>): MinigolfHole {
  return {
    id: 'sim-hole',
    name: 'Sim',
    theme: 'classic',
    par: 3,
    bounds: { x: 0, y: 0, width: 420, height: 300 },
    start: { x: 64, y: 140 },
    cup: { x: 340, y: 150, radius: 16 },
    walls: [{ x1: 210, y1: 40, x2: 210, y2: 260 }],
    bumpers: [{ kind: 'circle', x: 120, y: 180, radius: 18 }],
    hazards: {
      water: [],
      surfaces: [{ kind: 'rect', x: 250, y: 30, width: 100, height: 90, material: 'sand' }],
      slopes: []
    },
    movingObstacles: [],
    ...overrides
  };
}

function runPattern(patternSec: number[], maxFrames = 600): BallState {
  const hole = makeHole();
  const ball: BallState = { x: 90, y: 90, vx: 0, vy: 0, angularVelocity: 0, radius: 10, moving: false, restFrames: 0 };
  applyShot(ball, { angle: 0.58, power: 720 });
  const scratch = createPhysicsScratch();
  const slopeScratch = { x: 0, y: 0 };
  const obstacleScratch = { x: 0, y: 0 };
  const result = createPhysicsStepResult();
  let accumulator = 0;
  let elapsedMs = 0;
  for (let frame = 0; frame < maxFrames; frame += 1) {
    resetPhysicsStepResult(result);
    const frameDt = patternSec[frame % patternSec.length];
    const stepped = stepFixedSimulation(
      accumulator,
      frameDt,
      {
        fixedDtSec: DEFAULT_PHYSICS_CONFIG.fixedDtSec,
        maxSubstepsPerFrame: DEFAULT_PHYSICS_CONFIG.maxSubstepsPerFrame
      },
      (fixedDt) => {
        stepBallPhysics(ball, hole, elapsedMs, fixedDt, DEFAULT_PHYSICS_CONFIG, scratch, slopeScratch, obstacleScratch, result);
        elapsedMs += fixedDt * 1000;
        return !ball.moving;
      }
    );
    accumulator = stepped.accumulatorSec;
    if (!ball.moving && Math.hypot(ball.vx, ball.vy) < 0.01) {
      break;
    }
  }
  return ball;
}

describe('minigolf fixed-step simulation', () => {
  it('is deterministic for the same golden shot pattern', () => {
    const a = runPattern([1 / 60]);
    const b = runPattern([1 / 60]);
    expect(Math.abs(a.x - b.x)).toBeLessThan(0.0001);
    expect(Math.abs(a.y - b.y)).toBeLessThan(0.0001);
  });

  it('stays within tolerance under dt fuzz patterns', () => {
    const base = runPattern([1 / 60]);
    const fuzz = runPattern([1 / 30, 1 / 90, 1 / 48, 1 / 120, 1 / 75, 1 / 50]);
    const delta = Math.hypot(base.x - fuzz.x, base.y - fuzz.y);
    expect(delta).toBeLessThan(2.6);
    expect(Math.hypot(fuzz.vx, fuzz.vy)).toBeLessThan(0.5);
  });
});

