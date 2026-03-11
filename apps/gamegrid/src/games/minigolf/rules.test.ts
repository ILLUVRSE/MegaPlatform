import { describe, expect, it } from 'vitest';
import { applyShot, createPhysicsScratch, createPhysicsStepResult, DEFAULT_PHYSICS_CONFIG, resetBall, stepBallPhysics } from './physics';
import { applyWaterPenalty, buildSessionSummary, completeCurrentHole, createInitialSession, registerStroke, tickSessionTime, TIME_ATTACK_STROKE_PENALTY_MS } from './rules';
import type { BallState, MinigolfHole } from './types';

describe('minigolf rules', () => {
  it('stroke play tracks strokes and par delta', () => {
    let session = createInitialSession({ mode: 'stroke', holeOrder: ['h1'], practice: false });

    session = registerStroke(session);
    session = registerStroke(session);
    session = registerStroke(session);
    session = completeCurrentHole(session, 'h1', 4);

    const summary = buildSessionSummary(session);
    expect(summary.totalStrokes).toBe(3);
    expect(summary.totalPar).toBe(4);
    expect(summary.parDelta).toBe(-1);
  });

  it('water hazard resets to last safe and adds stroke penalty', () => {
    const hole: MinigolfHole = {
      id: 'water-test',
      name: 'Water',
      theme: 'classic',
      par: 3,
      bounds: { x: 0, y: 0, width: 200, height: 200 },
      start: { x: 20, y: 20 },
      cup: { x: 180, y: 180, radius: 16 },
      walls: [],
      bumpers: [],
      hazards: {
        water: [{ kind: 'rect', x: 90, y: 0, width: 60, height: 200 }],
        surfaces: [],
        slopes: []
      },
      movingObstacles: []
    };

    const ball: BallState = { x: 80, y: 100, vx: 0, vy: 0, angularVelocity: 0, radius: 10, moving: false, restFrames: 0 };
    applyShot(ball, { angle: 0, power: 220 });

    const stepResult = createPhysicsStepResult();
    stepBallPhysics(ball, hole, 0, 0.05, DEFAULT_PHYSICS_CONFIG, createPhysicsScratch(), { x: 0, y: 0 }, { x: 0, y: 0 }, stepResult);

    expect(stepResult.enteredWater).toBe(true);

    const safe = { x: 30, y: 100 };
    resetBall(ball, safe.x, safe.y);

    let session = createInitialSession({ mode: 'stroke', holeOrder: ['water-test'], practice: false });
    session = registerStroke(session);
    session = applyWaterPenalty(session);

    expect(ball.x).toBe(safe.x);
    expect(ball.y).toBe(safe.y);
    expect(session.currentHoleStrokes).toBe(2);
  });

  it('time attack applies timer and stroke penalties correctly', () => {
    let session = createInitialSession({ mode: 'time_attack', holeOrder: ['h1'], practice: false });
    session = tickSessionTime(session, 17_500);
    session = registerStroke(session);
    session = registerStroke(session);
    session = completeCurrentHole(session, 'h1', 3);

    const summary = buildSessionSummary(session);
    expect(summary.totalTimeMs).toBe(17_500 + TIME_ATTACK_STROKE_PENALTY_MS * 2);
    expect(summary.totalStrokes).toBe(2);
  });
});
