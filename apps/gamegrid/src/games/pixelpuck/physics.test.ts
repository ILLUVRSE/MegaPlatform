import { describe, expect, it } from 'vitest';
import { createPhysicsScratch, DEFAULT_PHYSICS, stepPixelPuckPhysics } from './physics';
import { getRinkById } from './rink';
import type { PaddleState, PuckState } from './types';

const rink = getRinkById('classic');

function createPaddle(x: number, y: number): PaddleState {
  return { x, y, vx: 0, vy: 0, radius: 34 };
}

function createPuck(x: number, y: number, vx: number, vy: number): PuckState {
  return { x, y, vx, vy, radius: 18 };
}

describe('pixelpuck CCD physics', () => {
  it('prevents high-speed tunneling through rails', () => {
    const puck = createPuck(rink.bounds.x + 80, rink.bounds.y + 120, -3000, 0);
    const scratch = createPhysicsScratch();
    stepPixelPuckPhysics(puck, { bottom: createPaddle(640, 560), top: createPaddle(640, 180) }, rink, 1 / 60, DEFAULT_PHYSICS, scratch, false);
    expect(puck.x).toBeGreaterThanOrEqual(rink.bounds.x + puck.radius - 0.01);
  });

  it('reflects off paddles at high speed', () => {
    const paddle = createPaddle(640, 560);
    const puck = createPuck(640, 500, 0, 2400);
    const scratch = createPhysicsScratch();
    let bounced = false;
    for (let i = 0; i < 6; i += 1) {
      stepPixelPuckPhysics(puck, { bottom: paddle, top: createPaddle(640, 160) }, rink, 1 / 60, DEFAULT_PHYSICS, scratch, false);
      if (puck.vy < 0) {
        bounced = true;
        break;
      }
    }
    expect(bounced).toBe(true);
  });

  it('detects goal crossing at high speed', () => {
    const puck = createPuck(rink.goals.bottom.x + rink.goals.bottom.width * 0.5, rink.goals.bottom.lineY - 40, 0, 3200);
    const scratch = createPhysicsScratch();
    let goal: typeof scratch.goal = null;
    for (let i = 0; i < 4; i += 1) {
      stepPixelPuckPhysics(puck, { bottom: createPaddle(640, 560), top: createPaddle(640, 160) }, rink, 1 / 60, DEFAULT_PHYSICS, scratch, false);
      if (scratch.goal) {
        goal = scratch.goal;
        break;
      }
    }
    expect(goal).toBe('top');
  });

  it('runs a short simulation without NaN positions', () => {
    const puck = createPuck(rink.bounds.x + 200, rink.bounds.y + 200, 900, 860);
    const bottom = createPaddle(640, 560);
    const top = createPaddle(640, 160);
    const scratch = createPhysicsScratch();
    for (let i = 0; i < 120; i += 1) {
      stepPixelPuckPhysics(puck, { bottom, top }, rink, 1 / 60, DEFAULT_PHYSICS, scratch, false);
      expect(Number.isFinite(puck.x)).toBe(true);
      expect(Number.isFinite(puck.y)).toBe(true);
    }
  });
});
