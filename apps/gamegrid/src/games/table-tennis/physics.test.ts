import { describe, expect, it } from 'vitest';
import { createBallState, createPhysicsResult, createPhysicsScratch, DEFAULT_TABLE_PHYSICS, stepBallPhysics } from './physics';

describe('table tennis physics', () => {
  it('ends point on net hit', () => {
    const ball = createBallState();
    const scratch = createPhysicsScratch();
    const result = createPhysicsResult();

    ball.active = true;
    ball.lastHitter = 0;
    ball.x = 0;
    ball.y = 8;
    ball.z = 12;
    ball.vx = 0;
    ball.vy = -180;
    ball.vz = 0;

    stepBallPhysics(ball, 0.08, DEFAULT_TABLE_PHYSICS, scratch, result);

    expect(result.ended).toBe(true);
    expect(result.reason).toBe('net');
    expect(result.winner).toBe(1);
  });
});
