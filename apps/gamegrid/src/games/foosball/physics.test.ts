import { describe, expect, it } from 'vitest';
import { createBallState, createTableBounds, detectGoalAndReset } from './physics';

describe('foosball physics', () => {
  it('detects full goal crossing and resets ball to center', () => {
    const bounds = createTableBounds();
    const ball = createBallState(bounds);

    ball.x = bounds.right + ball.radius + 2;
    ball.y = (bounds.goalTop + bounds.goalBottom) * 0.5;

    const scorer = detectGoalAndReset(ball, bounds);

    expect(scorer).toBe('player');
    expect(ball.x).toBe(bounds.centerX);
    expect(ball.y).toBe(bounds.centerY);
    expect(ball.vx).toBeLessThan(0);
  });
});
