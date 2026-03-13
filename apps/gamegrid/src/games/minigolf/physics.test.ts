import { describe, expect, it } from 'vitest';
import { applyShot, createPhysicsScratch, createPhysicsStepResult, DEFAULT_PHYSICS_CONFIG, findNearestSafeRespawn, resetBall, stepBallPhysics } from './physics';
import { applyWaterPenalty, createInitialSession, registerStroke } from './rules';
import { simulateShotForServer } from './serverSim';
import type { BallState, MinigolfHole } from './types';

function makeHole(overrides?: Partial<MinigolfHole>): MinigolfHole {
  return {
    id: 'test-hole',
    name: 'Test',
    theme: 'classic',
    par: 3,
    bounds: { x: 0, y: 0, width: 320, height: 220 },
    start: { x: 40, y: 110 },
    cup: { x: 280, y: 110, radius: 16 },
    walls: [],
    bumpers: [],
    hazards: {
      water: [],
      surfaces: [],
      slopes: []
    },
    movingObstacles: [],
    ...overrides
  };
}

describe('minigolf physics', () => {
  it('sleeps ball within configured threshold window', () => {
    const hole = makeHole();
    const ball: BallState = { x: 80, y: 110, vx: 120, vy: 0, angularVelocity: 15, radius: 10, moving: true, restFrames: 0 };
    const scratch = createPhysicsScratch();
    const result = createPhysicsStepResult();

    for (let i = 0; i < 600; i += 1) {
      stepBallPhysics(ball, hole, i * 1000 * DEFAULT_PHYSICS_CONFIG.fixedDtSec, DEFAULT_PHYSICS_CONFIG.fixedDtSec, DEFAULT_PHYSICS_CONFIG, scratch, { x: 0, y: 0 }, { x: 0, y: 0 }, result);
      if (!ball.moving) break;
    }

    expect(ball.moving).toBe(false);
    expect(Math.hypot(ball.vx, ball.vy)).toBeLessThanOrEqual(DEFAULT_PHYSICS_CONFIG.sleepEnterLinearSpeed);
  });

  it('water reset adds stroke and respawns to last safe', () => {
    const hole = makeHole({
      hazards: {
        water: [{ kind: 'rect', x: 120, y: 0, width: 90, height: 220 }],
        surfaces: [],
        slopes: []
      }
    });

    const ball: BallState = { x: 100, y: 110, vx: 0, vy: 0, angularVelocity: 0, radius: 10, moving: false, restFrames: 0 };
    applyShot(ball, { angle: 0, power: 300 });

    const stepResult = createPhysicsStepResult();
    for (let i = 0; i < 12 && !stepResult.enteredWater; i += 1) {
      stepBallPhysics(ball, hole, i * 16, 1 / 120, DEFAULT_PHYSICS_CONFIG, createPhysicsScratch(), { x: 0, y: 0 }, { x: 0, y: 0 }, stepResult);
    }
    expect(stepResult.enteredWater).toBe(true);

    const respawn = { x: 0, y: 0 };
    findNearestSafeRespawn(hole, 80, 110, ball.radius, 0, createPhysicsScratch(), { x: 0, y: 0 }, respawn);
    resetBall(ball, respawn.x, respawn.y);

    let session = createInitialSession({ mode: 'stroke', holeOrder: ['test-hole'], practice: false });
    session = registerStroke(session);
    session = applyWaterPenalty(session);

    expect(session.currentHoleStrokes).toBe(2);
    expect(respawn.x).toBeLessThan(120);
    expect(ball.x).toBe(respawn.x);
    expect(ball.y).toBe(respawn.y);
  });

  it('slope acceleration follows expected direction and clamps magnitude', () => {
    const hole = makeHole({
      hazards: {
        water: [],
        surfaces: [],
        slopes: [
          {
            kind: 'rect',
            x: 0,
            y: 0,
            width: 320,
            height: 220,
            forceX: 999,
            forceY: 999
          }
        ]
      }
    });

    const ball: BallState = { x: 80, y: 110, vx: 0, vy: 0, angularVelocity: 0, radius: 10, moving: true, restFrames: 0 };
    const result = createPhysicsStepResult();
    stepBallPhysics(ball, hole, 0, 0.1, DEFAULT_PHYSICS_CONFIG, createPhysicsScratch(), { x: 0, y: 0 }, { x: 0, y: 0 }, result);

    const speed = Math.hypot(ball.vx, ball.vy);
    expect(ball.vx).toBeGreaterThan(0);
    expect(ball.vy).toBeGreaterThan(0);
    expect(speed).toBeLessThanOrEqual(DEFAULT_PHYSICS_CONFIG.maxSlopeAccel * 0.1 + 1);
  });

  it('replays server shots deterministically through water, sand, and moving obstacle geometry', () => {
    const waterHole = makeHole({
      hazards: {
        water: [{ kind: 'rect', x: 150, y: 0, width: 70, height: 220 }],
        surfaces: [],
        slopes: []
      }
    });
    const water = simulateShotForServer(waterHole, { angle: 0, power: 0.42 });
    expect(water.reason).toBe('water');
    expect(water.enteredWater).toBe(true);

    const sandHole = makeHole({
      hazards: {
        water: [],
        surfaces: [{ kind: 'rect', x: 100, y: 40, width: 140, height: 120, material: 'sand' }],
        slopes: []
      }
    });
    const sandA = simulateShotForServer(sandHole, { angle: 0.15, power: 0.36 });
    const sandB = simulateShotForServer(sandHole, { angle: 0.15, power: 0.36 });
    expect(sandA.hitSand).toBe(true);
    expect(sandA.finalX).toBeCloseTo(sandB.finalX, 6);
    expect(sandA.finalY).toBeCloseTo(sandB.finalY, 6);

    const obstacleHole = makeHole({
      walls: [],
      bumpers: [],
      movingObstacles: [
        {
          id: 'sweeper',
          kind: 'rect',
          x: 120,
          y: 80,
          width: 40,
          height: 80,
          axis: 'x',
          range: 24,
          speed: 0,
          phase: 0
        }
      ]
    });
    const obstacle = simulateShotForServer(obstacleHole, { angle: 0.04, power: 0.5 });
    expect(obstacle.hitWall).toBe(true);
    expect(obstacle.reason).toBe('rest');
  });
});
